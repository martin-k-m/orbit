// Map an orbit_core::files language id to a CodeMirror language extension.
//
// Kept deliberately small and lazy: only the languages we actually bundle get a
// grammar. Everything else renders as plain text with the editor's other
// niceties (line numbers, selection, folding) still intact.

import type { Extension } from "@codemirror/state";
import { rust } from "@codemirror/lang-rust";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";

/** The CodeMirror language extension for a language id, or none for plain text. */
export function languageExtension(language?: string | null): Extension[] {
  switch (language) {
    case "rust":
      return [rust()];
    case "typescript":
      return [javascript({ typescript: true, jsx: true })];
    case "javascript":
      return [javascript({ jsx: true })];
    case "python":
      return [python()];
    case "json":
      return [json()];
    case "markdown":
      return [markdown()];
    case "html":
    case "xml":
    case "vue":
    case "svelte":
      return [html()];
    case "css":
    case "scss":
    case "less":
      return [css()];
    default:
      // toml/yaml/go/etc. — plain text is honest until we bundle a grammar.
      return [];
  }
}
