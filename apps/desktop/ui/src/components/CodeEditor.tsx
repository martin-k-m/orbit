import { useEffect, useRef } from "react";
import { EditorState, EditorSelection, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { useSettingsStore } from "@/store/settings";
import {
  search,
  searchKeymap,
  highlightSelectionMatches,
} from "@codemirror/search";
import { languageExtension } from "@/lib/editorLang";

// Orbit-flavoured editor theme, matched to the app's dark surface.
const orbitTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "hsl(240 10% 90%)",
      height: "100%",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily:
        'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)',
      caretColor: "hsl(0 72% 62%)",
      padding: "10px 0",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "hsl(240 5% 40%)",
      border: "none",
    },
    ".cm-activeLine": { backgroundColor: "hsl(240 10% 100% / 0.03)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "hsl(240 8% 70%)" },
    "&.cm-focused": { outline: "none" },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "hsl(0 72% 58% / 0.25)",
    },
    ".cm-cursor": { borderLeftColor: "hsl(0 72% 62%)" },
    // Matches highlighted by find, and the active one.
    ".cm-searchMatch": {
      backgroundColor: "hsl(350 89% 60% / 0.22)",
      outline: "1px solid hsl(0 72% 58% / 0.4)",
    },
    ".cm-searchMatch-selected": {
      backgroundColor: "hsl(0 72% 55% / 0.45)",
    },
    ".cm-selectionMatch": { backgroundColor: "hsl(240 10% 100% / 0.06)" },
    // The find / replace / go-to-line panel, themed to the app's dark surface.
    ".cm-panels": {
      backgroundColor: "hsl(240 9% 8%)",
      color: "hsl(240 10% 90%)",
      borderColor: "hsl(240 10% 18%)",
    },
    ".cm-panel.cm-search": { padding: "6px 8px" },
    ".cm-panel.cm-search input, .cm-panel.cm-search button, .cm-textfield": {
      backgroundColor: "hsl(240 10% 12%)",
      color: "hsl(240 10% 90%)",
      border: "1px solid hsl(240 10% 20%)",
      borderRadius: "6px",
      padding: "2px 6px",
    },
    ".cm-panel.cm-search button": { cursor: "pointer" },
    ".cm-panel.cm-search button[name='close']": { color: "hsl(240 6% 62%)" },
    ".cm-button": {
      backgroundImage: "none",
      backgroundColor: "hsl(0 72% 51% / 0.15)",
      color: "hsl(0 72% 72%)",
    },
  },
  { dark: true },
);

/** Per-document editor preferences. */
interface Prefs {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
}

/** The non-language editing extensions, shared by every document. */
function baseExtensions(
  readOnly: boolean,
  prefs: Prefs,
  onChange?: (v: string) => void,
  onCursor?: (line: number, col: number) => void,
): Extension[] {
  return [
    lineNumbers(),
    foldGutter(),
    history(),
    indentOnInput(),
    indentUnit.of(" ".repeat(prefs.tabSize)),
    EditorState.tabSize.of(prefs.tabSize),
    bracketMatching(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    // `top: true` docks the find bar above the editor rather than at the bottom.
    search({ top: true }),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    keymap.of([
      // Ctrl/Cmd+F find, Ctrl/Cmd+H replace, F3/Ctrl+G next, Ctrl+Alt+G go-to-line.
      ...searchKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    orbitTheme,
    EditorView.theme({ "&": { fontSize: `${prefs.fontSize}px` } }),
    ...(prefs.wordWrap ? [EditorView.lineWrapping] : []),
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.updateListener.of((u) => {
      if (u.docChanged && onChange) onChange(u.state.doc.toString());
      if ((u.docChanged || u.selectionSet) && onCursor) {
        const head = u.state.selection.main.head;
        const line = u.state.doc.lineAt(head);
        onCursor(line.number, head - line.from + 1);
      }
    }),
  ];
}

/**
 * A CodeMirror 6 editor.
 *
 * CodeMirror over Monaco on purpose: no web workers and no CDN fetch, so it
 * stays inside the app's strict CSP without special-casing. The document is
 * fully recreated when `path` changes, so switching files never leaks state
 * from the previous one.
 */
export function CodeEditor({
  path,
  value,
  language,
  readOnly = false,
  onChange,
  onCursor,
  reveal,
}: {
  path: string;
  value: string;
  language?: string | null;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Report the caret's 1-based line and column, for a status bar. */
  onCursor?: (line: number, col: number) => void;
  /** Scroll to a 1-based line; the `nonce` re-triggers a jump to the same line. */
  reveal?: { line: number; nonce: number };
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Keep the latest callbacks without forcing the editor to rebuild on each render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorRef = useRef(onCursor);
  onCursorRef.current = onCursor;

  // Editor preferences — changing one rebuilds the view with the new config.
  const fontSize = useSettingsStore((s) => s.fontSize);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const wordWrap = useSettingsStore((s) => s.wordWrap);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...baseExtensions(
          readOnly,
          { fontSize, tabSize, wordWrap },
          (v) => onChangeRef.current?.(v),
          (line, col) => onCursorRef.current?.(line, col),
        ),
        ...languageExtension(language),
      ],
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    // Emit the initial caret position so the status bar isn't blank on open.
    onCursorRef.current?.(1, 1);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Rebuild when the file, its language, read-only-ness, or an editor
    // preference changes. `value` is intentionally excluded: it seeds the doc,
    // and re-seeding on every keystroke would fight the user's cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, language, readOnly, fontSize, tabSize, wordWrap]);

  // Jump to a requested line (e.g. a search hit). Keyed on the nonce so the same
  // line can be revealed twice, but a re-render alone never re-scrolls.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !reveal) return;
    const doc = view.state.doc;
    const lineNo = Math.min(Math.max(reveal.line, 1), doc.lines);
    const pos = doc.line(lineNo).from;
    view.dispatch({
      selection: EditorSelection.cursor(pos),
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
    // Rebuilding the view (path change) runs this again for the new document.
    // Keyed on the nonce, not `reveal`, so repeat clicks re-scroll but edits don't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.nonce, path]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
