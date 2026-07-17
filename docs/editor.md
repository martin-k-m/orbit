# Editor

Every project has an **Explorer** tab: a file tree on the left, a code editor on
the right. Click a file to open it.

This is the foundation of Orbit's move toward an IDE. It is deliberately honest
about what it is today — a fast, capable file viewer/editor — and what it is
not yet.

## What works today

- **Lazy file tree** — expands one directory at a time, so it opens instantly
  even in a huge repository. Directories first, then files, sorted.
- **A real code editor** (CodeMirror 6) with line numbers, code folding, bracket
  matching, active-line highlight, multiple selections, undo/redo and soft wrap.
- **Syntax highlighting** for Rust, TypeScript/JavaScript (incl. JSX/TSX),
  Python, JSON, Markdown, HTML and CSS. Other languages open as plain text with
  every other editor feature intact.
- **Editing and saving** — edit a file and press `Cmd/Ctrl + S`. A dot marks
  unsaved changes.
- **File intelligence** — the status line shows the language, encoding
  (UTF-8/UTF-16, detected from the BOM), line ending (LF/CRLF) and size.
- **Safe with awkward files** — binary files are detected and shown as "not
  shown" rather than filling the editor with garbage; files over 5 MB open
  read-only so a save can't truncate them.

## Why CodeMirror, not Monaco

Monaco (VS Code's editor) loads web workers and, by default, fetches itself from
a CDN. Orbit ships a **strict Content-Security-Policy** (`connect-src 'self'`) —
the whole point of a local-first app is that it doesn't reach out to the
network. CodeMirror 6 needs neither workers nor a CDN, so it stays inside that
policy without exceptions, and it's genuinely fast. The engine that maps files
to a language (`orbit_core::files`) is editor-agnostic, so swapping editors
later is a frontend-only change.

## What's not here yet

Being straight about it, because the [roadmap](../ROADMAP.md) is:

- **No language server (LSP).** No go-to-definition, find-references, rename,
  hover types or real diagnostics. Highlighting is syntactic, not semantic.
- No multi-tab / split editors yet — one file at a time per project.
- No minimap, breadcrumbs or sticky scroll.
- No format-on-save or code actions.

These are the next steps toward a full editor. They're real work, not switches
to flip.

## Related

- [Terminal](./terminal.md) · [Workspaces](./workspace.md)
- [Architecture](./architecture.md) — where `orbit_core::files` sits
- [ROADMAP](../ROADMAP.md)
