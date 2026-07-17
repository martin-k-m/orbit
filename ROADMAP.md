# Roadmap

Orbit's north star: **the app you keep open all day next to your editor** — a
local-first workspace that replaces a handful of daily tools. Everything below
stays offline-first, private (no telemetry), fast, cross-platform and open
source.

This roadmap is intentionally honest about status. Items are marked:

- ✅ **Shipped** — in the latest release
- 🚧 **In progress** — actively being built
- 📋 **Planned** — designed, not yet started

Dates are deliberately absent; this is a sequence, not a schedule.

---

## v1.0 — Foundation ✅

The engine and the shell around it.

- ✅ **Project scanning & detection** — Rust, TypeScript/JavaScript, Python, Go,
  Docker, with framework hints and package-manager detection.
- ✅ **Project profiles** — human-editable `.project-orbit` (TOML).
- ✅ **Command runner** — commands inferred from manifests, run with captured
  output.
- ✅ **Dangerous-command guard** — `rm -rf`, `dd`, `mkfs`, fork bombs,
  `curl | sh`, force-push … require explicit confirmation.
- ✅ **Git status** — branch, cleanliness, ahead/behind, last commit.
- ✅ **Project health** — 0–100 score with actionable warnings.
- ✅ **Dependency inspection** — offline, read from manifests.
- ✅ **Local analytics** — time per language, build times. Never uploaded.
- ✅ **Command palette** (`⌘/Ctrl+K`), tray, native menus.
- ✅ **CLI companion** — `orbit scan|info|health|deps|git|commands|run|init`.
- 🚧 **Auto-update** — the updater is wired into the app; publishing signed
  update artifacts is pending an updater signing key (see docs/releasing.md).
- ✅ **CI/CD** — test, build and release across macOS (Intel + ARM), Windows, Linux.

---

## v1.1 — Workspaces & the terminal 🚧

Turning projects into true workspaces.

- 🚧 **Workspace model** — each project remembers its terminals, launch
  commands, env vars, notes, bookmarks, docs links and pinned logs. Switching a
  project restores the whole workspace.
- 📋 **Integrated terminal** — multiple tabs, split panes, persistent sessions,
  ANSI colour, scrollback, search, rename, shortcuts. Opens in the project
  directory. Detects the preferred shell (PowerShell, CMD, bash, zsh, fish).
  Sessions survive restarts.
- 📋 **Live log viewer** — per-process, colourised, searchable, filter to
  errors/warnings, copy/save/export, side-by-side logs, error surfacing.
- 📋 **Task runner** — build/test/lint/format/bench/deploy + custom scripts,
  with shortcuts, favourites, dependencies and parallel execution.

## v1.2 — Git power center & environments 📋

- 📋 **Git power center** — staged/unstaged/untracked files, commit, stage,
  push/pull/fetch, branch create/switch/delete, merge, rebase, cherry-pick,
  stashes, tags, contributors, and a commit-graph visualisation.
- 🚧 **Environment variable manager** — the engine is in
  (`orbit_core::env`: discovery across `.env`, `.env.local`, `.env.development`,
  `.env.production`, `.env.example`; dotenv parsing, secret detection + masking,
  duplicate / empty / invalid-key / missing-vs-template reporting). The visual
  editor UI is next.
- 📋 **Workspace notes** — Markdown notes per project (checklists, code blocks,
  links), stored locally.

## v1.3 — Containers, data & APIs 📋

- 📋 **Docker integration** — containers, images, networks, volumes, compose
  projects; start/stop/restart/rebuild/logs/exec; one-click compose startup.
- 📋 **Database explorer** — SQLite, PostgreSQL, MySQL/MariaDB, Redis. Browse
  tables, view records, run SQL, save queries, CSV import/export.
- 📋 **API explorer** — REST, GraphQL, WebSockets; collections, variables, auth,
  history, response viewer with JSON formatting and highlighting; auto-discovery
  of local APIs.

## v1.4 — Insight & search 📋

- 📋 **Developer dashboard** — active projects, coding hours, languages, build
  and test frequency, commits, terminal usage, most-used commands. All local.
- 📋 **System monitor** — CPU, RAM, disk, network, running dev servers and
  active ports, with per-project port attribution.
- 📋 **File explorer** — search, favourites, recent files, quick preview, reveal
  in OS explorer, drag & drop.
- 📋 **Universal search** — one `⌘/Ctrl+K` across projects, commands, files,
  branches, commits, notes, env vars, terminal history, databases, API requests
  and settings.

## v2.0 — Platform 📋

- 📋 **Plugin SDK** — plugins contribute panels, commands, dashboards, project
  analyzers, sidebar sections, widgets and status-bar items, with a documented,
  versioned API.
- 📋 **Ecosystem integrations** — first-class, beyond today's previews:
  - **Blink** — run commands, build-acceleration metrics, optimisation hints.
  - **Killer** — security scans, dependency audits, secret detection.
  - **Flux** — workflow execution, automation pipelines, scheduled tasks.
  - **Beacon** — local API detection, health, route discovery, request metrics.
- 📋 **UI/UX overhaul** — split views, multi-monitor, richer context menus,
  drag & drop, refined window management.

---

## Non-goals

Things Orbit will deliberately **not** do:

- Require an account, a server or a network connection for core features.
- Collect telemetry or send your code, projects or analytics anywhere.
- Replace your editor. Orbit sits *beside* it.

## Influencing the roadmap

Priorities follow real use. Open a
[feature request](https://github.com/martin-k-m/orbit/issues/new/choose) or
start a [discussion](https://github.com/martin-k-m/orbit/discussions) — the
items people actually ask for move up.
