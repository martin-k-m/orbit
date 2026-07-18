import { create } from "zustand";
import type { FileContents } from "@/lib/types";

/**
 * One open file in the editor area.
 *
 * `path` doubles as the tab's identity: opening a file that's already open
 * focuses the existing tab rather than making a duplicate, which is the
 * behaviour every IDE has trained people to expect.
 */
export interface EditorTab {
  path: string;
  name: string;
  contents: FileContents;
  /** The current editor text, which may differ from `contents.text`. */
  draft: string;
  /** `draft !== contents.text` — kept as state so the UI doesn't recompute it. */
  dirty: boolean;
  /**
   * A pending "scroll to this line" request (1-based), e.g. from a search hit.
   * The `nonce` makes repeat reveals of the same line distinct, so the editor
   * jumps again on a second click but not on every keystroke.
   */
  reveal?: { line: number; nonce: number };
}

/** Monotonic source of reveal nonces. Not time/random, so it stays testable. */
let revealSeq = 0;

interface EditorState {
  tabs: EditorTab[];
  activePath: string | null;
  /**
   * The file shown in the second (right) editor pane when the view is split,
   * or `null` when there's a single editor. Both panes render tabs from the
   * same `tabs` array, so a file open in both edits one shared draft.
   */
  splitPath: string | null;
  /** The active editor's caret position (1-based), for the status bar. */
  cursor: { line: number; col: number };
  setCursor: (line: number, col: number) => void;
  /** Open the given path (or the active one) in the right pane; null closes it. */
  setSplitPath: (path: string | null) => void;

  /**
   * Open a file, or focus it if it's already open. Reopening never discards
   * unsaved edits in the existing tab — it only brings it to the front.
   * Pass `revealLine` (1-based) to scroll the editor to a specific line, as a
   * search result does.
   */
  openTab: (path: string, contents: FileContents, revealLine?: number) => void;
  /** Focus an already-open tab. No-op if the path isn't open. */
  setActive: (path: string) => void;
  /** Scroll an already-open tab to a 1-based line (e.g. from the Outline). */
  revealLine: (path: string, line: number) => void;
  /**
   * Close a tab. If it was the active one, focus its right neighbour, falling
   * back to the left — the same rule as VS Code, Zed and friends.
   */
  closeTab: (path: string) => void;
  closeAll: () => void;
  /** Record an edit and refresh the dirty flag against the saved text. */
  updateDraft: (path: string, draft: string) => void;
  /**
   * Mark a tab clean after a successful write. The draft becomes the new saved
   * baseline, so a later identical edit is (correctly) not counted as dirty.
   */
  markSaved: (path: string) => void;
}

/** Last path segment, tolerating both `/` and `\` separators. */
export function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

/**
 * Pick the tab to focus after `closedIndex` is removed from `tabs` (the array
 * still containing the closed tab). Prefer the right neighbour, then the left,
 * then nothing when the last tab closes.
 */
function neighbourPath(tabs: EditorTab[], closedIndex: number): string | null {
  if (tabs.length <= 1) return null;
  const right = tabs[closedIndex + 1];
  if (right) return right.path;
  return tabs[closedIndex - 1]?.path ?? null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activePath: null,
  splitPath: null,
  cursor: { line: 1, col: 1 },

  setCursor: (line, col) => set({ cursor: { line, col } }),

  setSplitPath: (path) => set({ splitPath: path }),

  openTab: (path, contents, revealLine) => {
    const reveal =
      revealLine != null ? { line: revealLine, nonce: ++revealSeq } : undefined;
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      // Already open — focus it, keep unsaved edits, but honour a new reveal.
      set((s) => ({
        activePath: path,
        tabs: reveal
          ? s.tabs.map((t) => (t.path === path ? { ...t, reveal } : t))
          : s.tabs,
      }));
      return;
    }
    const tab: EditorTab = {
      path,
      name: basename(path),
      contents,
      draft: contents.text,
      dirty: false,
      reveal,
    };
    set((s) => ({ tabs: [...s.tabs, tab], activePath: path }));
  },

  setActive: (path) =>
    set((s) => (s.tabs.some((t) => t.path === path) ? { activePath: path } : s)),

  revealLine: (path, line) =>
    set((s) => ({
      activePath: s.tabs.some((t) => t.path === path) ? path : s.activePath,
      tabs: s.tabs.map((t) =>
        t.path === path ? { ...t, reveal: { line, nonce: ++revealSeq } } : t,
      ),
    })),

  closeTab: (path) =>
    set((s) => {
      const index = s.tabs.findIndex((t) => t.path === path);
      if (index === -1) return s;
      const nextActive =
        s.activePath === path ? neighbourPath(s.tabs, index) : s.activePath;
      return {
        tabs: s.tabs.filter((t) => t.path !== path),
        activePath: nextActive,
        // Collapse the split if its file just closed.
        splitPath: s.splitPath === path ? null : s.splitPath,
      };
    }),

  closeAll: () => set({ tabs: [], activePath: null, splitPath: null }),

  updateDraft: (path, draft) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.path === path ? { ...t, draft, dirty: draft !== t.contents.text } : t,
      ),
    })),

  markSaved: (path) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.path === path
          ? { ...t, contents: { ...t.contents, text: t.draft }, dirty: false }
          : t,
      ),
    })),
}));

/** The currently focused tab, or null when nothing is open. */
export function activeTab(state: EditorState): EditorTab | null {
  return state.tabs.find((t) => t.path === state.activePath) ?? null;
}
