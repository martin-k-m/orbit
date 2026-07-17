import { create } from "zustand";
import { getSetting, setSetting } from "@/lib/ipc";

/**
 * IntelliJ-style tool-window layout for the project workspace: which bottom
 * tool is docked, how tall the dock is, and whether the editor's file tree is
 * collapsed. The two size/visibility preferences persist across restarts (like
 * a real IDE remembering your layout); which tool is open is session state that
 * survives switching between projects but resets on relaunch.
 */
interface WorkspaceState {
  /** Docked bottom tool window (`null` = collapsed). In-memory only. */
  bottomTool: string | null;
  /** Height of the bottom dock, in px. Persisted. */
  dockHeight: number;
  /** Whether the editor's left file tree is collapsed. Persisted. */
  treeCollapsed: boolean;

  setBottomTool: (id: string | null) => void;
  toggleBottomTool: (id: string) => void;
  setDockHeight: (px: number) => void;
  toggleTree: () => void;
}

export const DOCK_MIN = 140;
export const DOCK_MAX = 640;
export const DOCK_DEFAULT = 300;

/** Clamp the dock to a usable range, falling back to the default for junk. */
function clampDock(px: number): number {
  if (!Number.isFinite(px)) return DOCK_DEFAULT;
  return Math.min(DOCK_MAX, Math.max(DOCK_MIN, Math.round(px)));
}

/** Best-effort persist — a failed settings write must never break the UI. */
function persist(key: string, value: string) {
  void setSetting(key, value).catch(() => {});
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  bottomTool: null,
  dockHeight: DOCK_DEFAULT,
  treeCollapsed: false,

  setBottomTool: (id) => set({ bottomTool: id }),
  toggleBottomTool: (id) =>
    set((s) => ({ bottomTool: s.bottomTool === id ? null : id })),
  setDockHeight: (px) => {
    const dockHeight = clampDock(px);
    set({ dockHeight });
    persist("workspace.dockHeight", String(dockHeight));
  },
  toggleTree: () =>
    set((s) => {
      const treeCollapsed = !s.treeCollapsed;
      persist("workspace.treeCollapsed", treeCollapsed ? "1" : "0");
      return { treeCollapsed };
    }),
}));

/** Load persisted workspace layout into the store on boot (called from App). */
export async function loadWorkspaceLayout(): Promise<void> {
  const [dh, tc] = await Promise.all([
    getSetting("workspace.dockHeight"),
    getSetting("workspace.treeCollapsed"),
  ]);
  const patch: Partial<WorkspaceState> = {};
  if (dh != null && Number.isFinite(Number(dh))) patch.dockHeight = clampDock(Number(dh));
  if (tc === "1" || tc === "0") patch.treeCollapsed = tc === "1";
  if (Object.keys(patch).length > 0) useWorkspaceStore.setState(patch);
}
