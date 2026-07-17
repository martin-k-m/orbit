import { create } from "zustand";
import { getSetting, setSetting } from "@/lib/ipc";

/** User-tunable editor preferences, applied live to every open editor. */
export interface EditorPrefs {
  /** Editor font size in px. */
  fontSize: number;
  /** Indent width, in spaces. */
  tabSize: number;
  /** Soft-wrap long lines. */
  wordWrap: boolean;
}

interface SettingsState extends EditorPrefs {
  setFontSize: (n: number) => void;
  setTabSize: (n: number) => void;
  setWordWrap: (b: boolean) => void;
}

export const EDITOR_DEFAULTS: EditorPrefs = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
};

/** Clamp to a sane range and round, falling back to `lo` for junk input. */
function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/** Best-effort persist — a failed settings write must never break the UI. */
function persist(key: string, value: string) {
  void setSetting(key, value).catch(() => {});
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...EDITOR_DEFAULTS,

  setFontSize: (n) => {
    const fontSize = clamp(n, 9, 28);
    set({ fontSize });
    persist("editor.fontSize", String(fontSize));
  },
  setTabSize: (n) => {
    const tabSize = clamp(n, 1, 8);
    set({ tabSize });
    persist("editor.tabSize", String(tabSize));
  },
  setWordWrap: (wordWrap) => {
    set({ wordWrap });
    persist("editor.wordWrap", wordWrap ? "1" : "0");
  },
}));

/** Load persisted editor prefs into the store on boot (called from App). */
export async function loadEditorPrefs(): Promise<void> {
  const [fs, ts, ww] = await Promise.all([
    getSetting("editor.fontSize"),
    getSetting("editor.tabSize"),
    getSetting("editor.wordWrap"),
  ]);
  const patch: Partial<EditorPrefs> = {};
  if (fs != null && Number.isFinite(Number(fs))) patch.fontSize = clamp(Number(fs), 9, 28);
  if (ts != null && Number.isFinite(Number(ts))) patch.tabSize = clamp(Number(ts), 1, 8);
  if (ww === "1" || ww === "0") patch.wordWrap = ww === "1";
  if (Object.keys(patch).length > 0) useSettingsStore.setState(patch);
}
