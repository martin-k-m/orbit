import { create } from "zustand";
import { setSetting } from "@/lib/ipc";
import type { ProjectSummary } from "@/lib/types";

export type View =
  | { kind: "dashboard" }
  | { kind: "analytics" }
  | { kind: "ecosystem" }
  | { kind: "settings" }
  | { kind: "project"; id: string; path: string };

export type Theme = "dark" | "light" | "system";

export type ToastVariant = "default" | "success" | "error";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

/** A request to open a specific file in a project's editor (from quick-open). */
export interface PendingFile {
  projectId: string;
  path: string;
  line?: number;
}

interface AppState {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  view: View;
  theme: Theme;
  paletteOpen: boolean;
  toasts: Toast[];
  /** A file the project view should open once it is showing that project. */
  pendingFile: PendingFile | null;

  setProjects: (projects: ProjectSummary[]) => void;
  navigate: (view: View) => void;
  openProject: (id: string, path: string) => void;
  requestOpenFile: (file: PendingFile) => void;
  clearPendingFile: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  view: { kind: "dashboard" },
  theme: "dark",
  paletteOpen: false,
  toasts: [],
  pendingFile: null,

  setProjects: (projects) => set({ projects }),

  navigate: (view) =>
    set({
      view,
      selectedProjectId: view.kind === "project" ? view.id : null,
    }),

  openProject: (id, path) =>
    set({ view: { kind: "project", id, path }, selectedProjectId: id }),

  requestOpenFile: (file) => {
    const proj = get().projects.find((p) => p.id === file.projectId);
    set({
      view: proj
        ? { kind: "project", id: proj.id, path: proj.path }
        : get().view,
      selectedProjectId: file.projectId,
      pendingFile: file,
    });
  },

  clearPendingFile: () => set({ pendingFile: null }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
    // Persist, or the choice is forgotten on the next launch. App.tsx reads
    // this back on boot.
    void setSetting("theme", theme).catch(() => {
      /* storage is best-effort; a failed write must not break the UI */
    });
  },

  toggleTheme: () => {
    // Cycle dark → light → system, so the palette's "toggle theme" can reach
    // every option without a submenu.
    const order: Theme[] = ["dark", "light", "system"];
    const next = order[(order.indexOf(get().theme) + 1) % order.length];
    get().setTheme(next);
  },

  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),

  pushToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-dismiss after 4s.
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Whether the OS is currently asking for a dark UI. Defaults to dark. */
function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(DARK_QUERY).matches;
}

/** Turn the user's preference into the surface we actually paint. */
export function resolveTheme(theme: Theme): "dark" | "light" {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
}

/**
 * Follow the OS theme while the user's preference is "system".
 *
 * Returns an unsubscribe function. Without this, picking "system" would only
 * apply the OS theme at that moment and then go stale when the OS flipped.
 */
export function watchSystemTheme(): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (useAppStore.getState().theme === "system") {
      applyTheme("system");
    }
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
