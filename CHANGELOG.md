# Changelog

All notable changes to Orbit are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/martin-k-m/orbit/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/martin-k-m/orbit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/martin-k-m/orbit/releases/tag/v1.0.0
