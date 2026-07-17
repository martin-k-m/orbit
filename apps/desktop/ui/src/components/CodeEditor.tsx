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
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
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
  },
  { dark: true },
);

/** The non-language editing extensions, shared by every document. */
function baseExtensions(readOnly: boolean, onChange?: (v: string) => void): Extension[] {
  return [
    lineNumbers(),
    foldGutter(),
    history(),
    indentOnInput(),
    bracketMatching(),
    highlightActiveLine(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    orbitTheme,
    EditorView.lineWrapping,
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.updateListener.of((u) => {
      if (u.docChanged && onChange) onChange(u.state.doc.toString());
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
  reveal,
}: {
  path: string;
  value: string;
  language?: string | null;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Scroll to a 1-based line; the `nonce` re-triggers a jump to the same line. */
  reveal?: { line: number; nonce: number };
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Keep the latest onChange without forcing the editor to rebuild on each render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...baseExtensions(readOnly, (v) => onChangeRef.current?.(v)),
        ...languageExtension(language),
      ],
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Rebuild when the file, its language, or read-only-ness changes. `value` is
    // intentionally excluded: it seeds the doc, and re-seeding on every keystroke
    // would fight the user's cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, language, readOnly]);

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
