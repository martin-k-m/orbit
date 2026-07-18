# Roadmap

Orbit's north star: **a local-first IDE you keep open all day** — a real editor
plus the tools around it (git, terminals, containers, databases, APIs, AI), all
offline-first, private (no telemetry), fast, cross-platform and open source.

This roadmap is intentionally honest about status:

- ✅ **Shipped** — in the latest release
- 🚧 **In progress / partial** — a real slice has landed; more to come
- 📋 **Planned** — designed, not yet started

Dates are deliberately absent; this is a sequence, not a schedule.

---

## Shipped ✅

The core IDE is here today.

**Workspace & editor**

- ✅ **IntelliJ-style workspace** — an icon-only activity bar, a permanent editor
  centre, and a resizable docked bottom tool-window strip (Problems, Git, Search,
  Testing, Terminal, Overview, Commands, Health, Dependencies). Layout persists.
- ✅ **Multi-file CodeMirror editor** — tabs (per-tab drafts/dirty state),
  breadcrumbs, find/replace/go-to-line, a document outline, editor preferences,
  and **split editors** (two panes over one shared document model).
- ✅ **File explorer** — lazy tree, create/rename/delete, collapsible rail.
- ✅ **Interactive status bar** — branch, caret position, indent, encoding, EOL,
  language, and an AI indicator; clickable segments.

**Tools**

- ✅ **Git power center** — staged/unstaged groups, one-click stage/unstage,
  inline diff, commit, history with a **commit-graph rail**, branches, stash,
  tags, and fetch/pull/push.
- ✅ **Terminal 3.0** — PTY-backed shells with tabs, **split panes**, **in-terminal
  search**, and **shell profiles**.
- ✅ **Containers** — list Docker containers/images, start/stop/restart.
- ✅ **Database** — a read-only SQLite explorer (browse tables, run `SELECT`s).
- ✅ **APIs** — a REST client with a JSON-aware response viewer.
- ✅ **Testing** — run the test command with a parsed cargo/Jest/Vitest/pytest
  summary.
- ✅ **AI assistant** — a project-aware chat over any OpenAI-compatible endpoint
  (local Ollama/LM Studio/llama.cpp or hosted), off by default, local-first.
- ✅ **Workspace search** — in-project find-in-files with click-through, plus
  quick-open in the command palette.
- ✅ **Project intelligence** — scanning/detection, profiles, command runner
  (dangerous-command guard), health score, dependency inspection, local
  analytics, environment (`.env`) discovery.

**Platform**

- ✅ **CLI companion** — `orbit scan|info|health|deps|git|commands|run|init`.
- ✅ **Signed auto-update**, on-demand update check, system tray, native menus,
  Dark/Light/High-Contrast/System themes, a launch splashscreen.
- ✅ **CI/CD** — test, build and release across macOS (Intel + ARM), Windows and
  Linux; the release pipeline signs macOS + Windows when signing certs are
  provided (see [docs/SIGNING.md](docs/SIGNING.md)).

## In progress / partial 🚧

- 🚧 **Language servers** — a real LSP client ships live diagnostics in the
  Problems panel. Next: wiring go-to-definition / hover / rename to editor
  gestures (the plumbing exists).
- 🚧 **Git** — merge/rebase/cherry-pick, blame, and richer history are next.
- 🚧 **Database** — Postgres/MySQL/Redis, saved queries and export beyond SQLite.
- 🚧 **APIs** — collections, auth, history, GraphQL/WebSockets.
- 🚧 **Universal search** — the cross-source `⌘/Ctrl+K` (projects, commands,
  files, branches, commits, …) on top of today's in-project search.

## Planned 📋

- 📋 **Debugger (DAP)** — breakpoints, watches, call stack, launch profiles.
- 📋 **Plugin SDK & marketplace** — a versioned API for extensions (languages,
  themes, panels, commands, AI providers, debuggers), installed/updated from the
  Plugins view. Today that view lists built-ins and the AI-provider integration.
- 📋 **Terminal session persistence** across restarts.
- 📋 **Docker** — networks/volumes/compose/logs/exec.
- 📋 **Detachable panels / multi-window / multi-monitor.**
- 📋 **Live log viewer** and a **system monitor** (CPU/RAM/ports per project).

---

## Non-goals

Things Orbit will deliberately **not** do:

- Require an account, a server or a network connection for core features.
- Collect telemetry or send your code, projects or analytics anywhere.
- Bloat into a heavyweight platform. Orbit keeps every feature fast and
  local-first — it earns its place beside (or as) your editor, not by count.

## Influencing the roadmap

Priorities follow real use. Open a
[feature request](https://github.com/martin-k-m/orbit/issues/new/choose) or
start a [discussion](https://github.com/martin-k-m/orbit/discussions) — the
items people actually ask for move up.
