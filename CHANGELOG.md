# Changelog

All notable changes to Orbit are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Split editors.** The editor can now **split side by side** — open a second
  file next to the first, or the same file twice to work in two places at once.
  Because both panes render from one shared document model, editing a file open
  in both panes updates both live and there's a single unsaved state to save.
- **Terminal 3.0.** The integrated terminal grows real IDE ergonomics: an
  **in-terminal find bar** (Ctrl/Cmd+F, next/previous, backed by the xterm search
  addon), a **side-by-side split** so you can watch a build in one pane and work
  in another, and **shell profiles** — the `＋` has a menu of the shells Orbit
  found, and each tab is labelled with the shell it launched. (Cross-restart
  session persistence is still to come.)
- **Commit graph in Source Control.** The history now draws a real
  **commit-graph rail** — a lane per branch with a node in each commit's lane —
  so you can read branch and merge structure at a glance. Backed by a new
  `git::recent_graph` plus a **pure, unit-tested lane-layout** function (parents
  from `git log %P`), on the same `git` CLI as the rest of the power center.
- **AI assistant — local-first and optional.** A new **AI** tool window brings a
  project-aware chat to the workspace, backed by any **OpenAI-compatible**
  endpoint you configure in Settings → AI: a local runtime (Ollama, LM Studio, a
  llama.cpp server) or a hosted provider. It is **off by default**, the endpoint,
  model and key are stored only on your device, and Orbit contacts nothing until
  you enable it and send a message. Built on a new unit-tested `orbit_core::ai`
  module (OpenAI-compatible request/response over `curl`, like the API explorer),
  so a model on `localhost` and a cloud endpoint share one code path.

### Removed

- **Blink/Killer/Flux/Beacon plumbing.** The last of the old ecosystem
  sibling-detection is gone — the `EcosystemLink` model field, its detection, and
  the unused UI metadata — so the codebase no longer carries integrations that
  never had a real engine behind them.

## [1.3.1] — 2026-07-17

Finishing touches on the IntelliJ-style tool-window system.

### Added

- **Resizable tool windows.** The bottom tool-window dock can now be
  resized by dragging its top edge; the height is clamped to a usable
  range and **remembered across restarts**.
- **Collapsible file tree.** The editor's left Explorer collapses to a
  thin rail (and back), for more room to read code.
- **Remembered layout.** The docked tool window, dock height and file-tree
  state now persist — the docked tool and tree survive switching between
  projects, and the sizes/visibility survive relaunching — instead of
  resetting every time you open a project.

## [1.3.0] — 2026-07-17

The IntelliJ-style workspace overhaul. Orbit's IDE grows a real
tool-window layout — a permanent editor centre with a docked bottom
tool-window strip — a live status bar, flatter professional chrome, and
sheds the Ecosystem previews.

### Changed

- **IntelliJ-style workspace.** A project now opens as a genuine IDE layout: a
  top toolbar (project, language, live git branch/ahead-behind), the **editor as
  the permanent centre** (file tree + tabs + breadcrumbs + code, filling the full
  viewport height), and a collapsible **bottom tool-window strip** — Problems,
  Git, Search, Testing, Terminal, Overview, Commands, Health, Dependencies — that
  docks the selected tool below the editor and toggles shut, exactly like the
  IntelliJ tool windows. The old in-project tab bar is gone.
- **IntelliJ-style shell + status bar.** A slim IDE **status bar** now runs
  across the bottom — the current git branch, the active editor's caret
  position (Ln, Col), and the file's language / encoding / line ending. The
  shell was flattened toward a professional IDE look: the marketing gradient
  washes are gone, panels are solid, the title bar and tool sidebar are denser,
  and a project fills the full width like a real IDE.
- **Removed the Ecosystem previews.** The Blink/Killer/Flux/Beacon preview page
  and its badges are gone; the sidebar and command palette navigate the real
  tools instead.
- **Dashboard redistributed.** The old Dashboard is now a lean **Projects**
  launcher (recent projects + quick actions); its coding stats moved into
  **Analytics**, and live per-project context lives in the new status bar.

## [1.2.0] — 2026-07-17

The IDE release. Orbit grows from a developer command center into a genuine,
local-first IDE: multi-file editing, universal search, a full git power center,
Docker/database/API tooling, a testing panel, live language-server diagnostics,
and a red visual identity with a launch splashscreen — all offline-first and
private.

### Added

- **Check for updates, on demand** — Settings now has an Updates section with a
  "Check for updates" button that finds, downloads and installs a signed update
  and relaunches, on top of the automatic check on launch.
- **Git tags** — the Source Control panel now lists a repo's tags and can create
  a lightweight tag at HEAD (new `git::tags`/`create_tag` helpers, unit-tested).
- **High Contrast theme** — a fourth theme (alongside Dark / Light / System) in
  Settings: a pure-black surface with white text, a vivid red accent and strong
  borders for low-vision use. Persists across restarts like the others.
- **Commit detail in Source Control** — clicking a commit in the history now
  shows its full patch in the diff viewer (via a new `git show` engine helper,
  unit-tested), so you can review any past change without leaving the panel.
- **Language-server diagnostics** — first real LSP integration: the Problems
  panel now shows **live diagnostics from a language server** for the files you
  have open, merged with the health/environment diagnostics. It's built on a new
  full LSP client in `orbit_core::lsp` — base protocol (`Content-Length` framing
  + JSON-RPC + streaming `Decoder`), a transport-free `Session` state machine
  (handshake, id correlation, `didOpen`/`definition`, `publishDiagnostics`), and
  an `LspDriver` that spawns a real server and pumps its stdio through the
  session on a background thread. The pure parts are fully unit-tested; a server
  is started lazily per language when one is installed (rust-analyzer,
  typescript-language-server, pylsp, gopls) and Orbit degrades quietly when none
  is. Go-to-definition plumbing is in place; wiring it to an editor gesture is
  next.
- **Document outline** — a toggle in the editor status bar opens an Outline
  panel listing the active file's symbols (functions, classes, structs,
  headings…); clicking one jumps the editor to that line. Symbols come from a
  new syntactic `orbit_core::outline` module (Rust/TS/JS/Python/Go/Markdown,
  unit-tested) — approximate by design, since there's no language server yet.
- **API explorer** — a new APIs view: pick a method, enter a URL, add headers
  and a body, and send. The response comes back with a colour-coded status,
  timing, headers and a pretty-printed (JSON-aware) body. Built on a new
  `orbit_core::http` module that shells out to `curl` (so no TLS stack in the
  engine); the response parser is unit-tested. No collections/auth/history yet.
- **File operations in the Explorer** — create files and folders (a toolbar for
  the project root, hover actions on any folder), rename entries inline, and
  delete with a two-click confirm. Backed by new guarded `orbit_core::files`
  helpers (`create_file`/`create_dir`/`rename_path`/`delete_path`) that refuse
  to clobber an existing path; unit-tested. Deleting or renaming a file closes
  its editor tab.
- **Terminal tabs** — the Terminal tab now hosts multiple shells: a `＋` opens a
  new one, a tab strip switches between them, and closing focuses a neighbour.
  Background terminals stay alive (panes stay mounted and refit when shown), so
  a build can keep running in one tab while you work in another. Splits, search
  and cross-restart persistence are still to come.
- **Editor preferences + searchable settings** — the Settings page gained a
  search box that filters its sections, and a new Editor section with **font
  size**, **tab size** and **word wrap** controls that apply live to every open
  editor and persist across restarts (a new `settings` store, unit-tested,
  backed by the existing setting storage).
- **Testing panel** — a new Testing tab runs a project's `test` command and
  shows a parsed pass/fail summary (badges + framework) alongside the raw output
  and exit code. Summaries are parsed by a new `orbit_core::testing` module that
  recognises `cargo test`, Jest/Vitest and pytest output (unit-tested);
  unrecognised runners still show their output.
- **Database explorer (SQLite)** — a new Database view opens a `.sqlite`/`.db`
  file **read-only**, lists its tables/views with row counts, shows the first
  rows of any table, and runs ad-hoc `SELECT` queries (`Ctrl/Cmd+Enter`), with a
  null-aware results grid. Built on a new `orbit_core::db` module (feature-gated
  behind `persistence`, unit-tested — including that writes are rejected).
  Postgres/MySQL/Redis will follow behind the same shape.
- **Docker integration** — a new Containers view lists your Docker containers
  (running + stopped) and images, with one-click start / stop / restart. Built
  on a new `orbit_core::docker` module that shells out to the `docker` CLI and
  degrades gracefully when Docker isn't installed or the daemon is down (the
  JSON parsers are unit-tested). No compose/logs/exec yet.
- **Quick-open — fuzzy file search in the command palette** — with a project
  open, `⌘/Ctrl+K` and typing now searches that project's files (backed by a new
  capped `orbit_core::files::list_files`, which skips ignored/hidden dirs).
  Picking a file opens it in an editor tab and reveals the Explorer — the first
  cross-source step of the universal palette.
- **Problems panel** — a new Problems tab gives a unified, navigable diagnostics
  view: it aggregates the diagnostics Orbit actually computes today — project
  **health** warnings and **environment** issues — sorted errors-first, each
  clickable to open the file (env issues jump to the offending line). It's
  deliberately scoped and labelled: these are Orbit's own diagnostics, not
  `rustc`/`tsc`/lint output (that needs the not-yet-built LSP integration).
- **Source control — the git power center** — a new Source Control tab turns git
  into a first-class panel: staged vs. unstaged/untracked groups with one-click
  stage/unstage (per file or all), an inline coloured diff viewer, a commit box
  (`Ctrl/Cmd+Enter` to commit), recent history, **branch management** (switch,
  create), **fetch / pull / push** (pull is fast-forward-only so a one-click
  pull never opens a merge editor) and **stashes** (stash changes, pop, drop).
  Built on `orbit_core::git`, now extended with `status`/`stage`/`unstage`/
  `diff`/`commit`/`recent_commits`/`branches`/`switch_branch`/`create_branch`/
  `fetch`/`pull`/`push`/`stash_save`/`stash_list`/`stash_pop`/`stash_drop` (still
  shelling out to the `git` binary; unit-tested against temp repos, incl. a local
  bare remote). `current_branch` now also resolves the branch name before the
  first commit.
- **In-editor find, replace & go-to-line** — the editor gained CodeMirror's
  search: `Ctrl/Cmd+F` to find (with match highlighting), `Ctrl/Cmd+H` to
  replace, `F3`/`Ctrl/Cmd+G` for next/previous, and `Ctrl+Alt+G` to jump to a
  line. The find panel is themed to Orbit's dark-red surface. The editor status
  row now also shows the live caret position (**Ln, Col**).
- **Red brand identity + launch splashscreen** — the app now wears Orbit's red
  (red-600 → rose-500, matched to the website): retuned accent tokens, a
  redesigned glowing orbit logo, a gradient wordmark in the titlebar, and a
  red favicon. Launch shows a black-and-red splashscreen — an animated logo,
  wordmark and loading bar — that fades into the app once projects have loaded.
  A red master `app-icon.svg` is committed as the source for the OS launcher
  icon (regenerate the raster set with `scripts/gen-icons.sh` + the Tauri CLI).
- **Workspace search — find in files** — a new Search tab in each project runs a
  literal, ASCII-case-insensitive (optionally case-sensitive or whole-word)
  content search across the project, powered by the new `orbit_core::search`
  engine. It skips ignored (`node_modules`, `target`, `.git`, …), binary and
  oversized files, and caps its own output so a broad query stays cheap.
  Results group by file with the matched span highlighted; clicking one opens
  the file in an editor tab and scrolls to the line.
- **Editor tabs — multi-file editing** — the Explorer now keeps every file you
  open in its own tab instead of replacing the one before it. Each tab holds its
  own unsaved draft and dirty marker, reopening a file focuses its existing tab
  rather than duplicating it, and closing the active tab moves focus to its
  neighbour (right, then left). `Ctrl/Cmd+S` saves the active tab; `Ctrl/Cmd+W`
  closes it. Tabs are scoped per project, so switching projects starts clean.
- **File explorer + code editor** — a project Explorer tab with a lazy file
  tree and a CodeMirror 6 editor: syntax highlighting for 7 languages, folding,
  multi-cursor, save, and a status line showing language/encoding/line-ending.
  Binary files are detected; files over 5 MB open read-only. Backed by the new
  `orbit_core::files` module (encoding, line-ending and language detection).

## [1.1.0] — 2026-07-17

### Added

- **Integrated terminal** — every project has a real PTY-backed shell (ConPTY on
  Windows, `openpty` elsewhere), so colours, prompts, `top`/`vim`, Ctrl-C and
  reflow all work. Opens in the project directory, in your shell. Tabs, splits,
  search and sessions that survive a restart are still to come.
- **Shell detection** (`orbit_core::shell`) — respects `$SHELL`/`COMSPEC`, then
  the best shell actually installed (pwsh → PowerShell → cmd; zsh → fish → bash),
  with a guaranteed fallback. `bash`/`zsh` start as login shells so your profile
  loads.
- **Workspaces and the environment manager are reachable from the app** — the
  engine had both, but no command exposed them. `get_workspace`,
  `save_workspace`, `run_task` (safety-guarded) and `env_report` are now wired
  through the IPC surface.
- **Website:** a dedicated `/download` page with per-architecture installers
  (macOS Apple Silicon + Intel, Windows MSI/EXE, Linux AppImage/deb), plus
  `/roadmap`, `/changelog`, `Configuration` and `Troubleshooting` pages.

- **Signed auto-updates** — the updater signing key is generated, password-
  protected and configured, so releases from now on publish signed update
  artifacts and `latest.json`. v1.0.0 shipped without them.
- **System theme** — Appearance now offers Dark / Light / System; "System"
  follows the OS and updates live when it changes.

### Fixed

- Desktop bundles failed to compile: `CommandOutput` was not `Serialize`, so
  `tauri::generate_handler!` could not expand. A guard test now asserts every
  IPC type is serializable, catching this class of bug in `cargo test` rather
  than in a platform bundle job.
- Tauri's before-commands run from the app root, so `npm --prefix ../ui`
  resolved to a nonexistent path and every platform build failed.
- Release jobs could not decode the updater signing key: the generated minisign
  key was password-protected, so with no password supplied minisign fell back to
  an interactive prompt that CI has no TTY for, surfacing as "Wrong password".
  Regenerated with an explicit password and verified through Tauri's decode path.
- The theme was never persisted: the app read a `theme` setting on boot that
  nothing ever wrote, so it reset to dark on every launch.
- Light mode inherited dark-tuned `--success`/`--warning`/`--danger`, which are
  lightened for a near-black surface and washed out on white.

### Changed

- Documentation and marketing copy now describe only what exists: removed claims
  of built-in security scanners, `.project-orbit` workflow chaining, and
  auto-updates installing in place.

## [1.0.0] — 2026-07-16

The first public release.

### Added

- **`orbit-core` engine** — a pure Rust library with project scanning and
  ecosystem detection (Rust, Node/TS, Python, Go, Docker), `.project-orbit`
  profiles, git status, process running, dependency inspection, a 0–100 health
  score, local analytics aggregation and SQLite persistence.
- **Dangerous-command guard** — `orbit-core::safety` assesses commands for
  destructive intent (`rm -rf`, `dd`, `mkfs`, fork bombs, `curl | sh`, force
  pushes, …) and both surfaces require confirmation before running them.
- **`orbit-cli`** — a terminal companion (`orbit scan|info|health|deps|git|
  commands|run|init`) with a `--json` flag, built on the engine.
- **`orbit-desktop`** — a Tauri 2 desktop app for macOS, Windows and Linux with
  a command palette, project dashboard, project detail views, health, a
  dependency manager, local analytics and ecosystem integrations. React +
  TypeScript + Tailwind frontend with a premium dark design.
- **Auto-update (opt-in)** — the desktop app ships the Tauri updater and checks
  GitHub Releases on launch. Signed update artifacts are not published in
  v1.0.0: enabling them needs an updater signing key (see docs/releasing.md).
  Update checks no-op safely until then; installers are the supported path.
- **Environment file manager** — `orbit_core::env` discovers and parses `.env`,
  `.env.local`, `.env.development`, `.env.production` and `.env.example`, masks
  secrets, and reports duplicate, empty, invalid and missing variables.
- **Marketing site & docs** — the Next.js website lives in its own repo,
  [`orbit-web`](https://github.com/martin-k-m/orbit-web) (deployed to
  https://orbit.blinkdev.me).
- **CI/CD** — GitHub Actions split into `test`, `build` and `release`
  workflows, building installers for macOS (Intel + Apple Silicon),
  Windows and Linux.

[Unreleased]: https://github.com/martin-k-m/orbit/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/martin-k-m/orbit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/martin-k-m/orbit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/martin-k-m/orbit/releases/tag/v1.0.0
