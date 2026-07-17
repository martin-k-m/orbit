# Orbit v1.3.0 — Release Notes

**The IntelliJ-style workspace overhaul.** Orbit's IDE grows a real
tool-window layout — a permanent editor centre with a docked bottom tool-window
strip, a live status bar, and flatter, more professional chrome. The old
Ecosystem previews are gone; the Dashboard is now a focused Projects launcher.

Still everything you'd expect: local-first, no account, no telemetry, fast, and
cross-platform.

## Highlights

### 🧭 A real IDE layout

A project now opens like IntelliJ IDEA:

- A **top toolbar** with the project, its language, and a live git readout
  (branch, clean/changed, ahead/behind).
- The **editor is the permanent centre** — file tree, tabs, breadcrumbs and the
  CodeMirror editor fill the full height of the window.
- A collapsible **bottom tool-window strip** docks one tool at a time below the
  editor: **Problems · Git · Search · Testing · Terminal · Overview · Commands ·
  Health · Dependencies**. Click a tool to dock it, click again to collapse —
  exactly like IntelliJ's tool windows. The old in-project tab bar is gone.

### 📊 A live status bar

A slim status bar runs across the bottom of the window: the current git branch,
the active editor's caret position (**Ln, Col**), and the file's **language /
encoding / line ending** — always visible, IDE-style.

### 🎨 Flatter, more professional chrome

The marketing gradient washes are gone. Panels are solid, the title bar and the
tool sidebar are denser, tabs use a clean underline, and a project fills the full
width of the window like a real IDE.

### 🧹 Focused navigation

- The **Ecosystem previews** (Blink/Killer/Flux/Beacon) — which were never
  backed by real engines — have been **removed** entirely.
- The old Dashboard is now a lean **Projects** launcher; its coding stats moved
  into **Analytics**, and live per-project context lives in the new status bar.
- The command palette and sidebar navigate the real tools — Containers,
  Database, APIs, Analytics, Settings.

## Everything from v1.2.0, still here

Multi-file editing, workspace search, quick-open, the full git power center
(stage/diff/commit/history/branches/stash/tags), Containers · Database · APIs,
the Testing panel, live language-server diagnostics in Problems, the red identity
+ launch splashscreen, the High-Contrast theme, and signed auto-update with an
on-demand "Check for updates" in Settings.

## Under the hood

A pure UI/layout release — no engine changes. The 100+ `orbit_core` tests stay
green and the desktop bundle builds on macOS (Intel + Apple Silicon), Windows and
Linux.

## Still to come

Split editors, the LSP go-to-definition/hover gestures, a debugger, and a plugin
SDK — tracked honestly in the [roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).
