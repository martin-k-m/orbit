# Changelog

All notable changes to Orbit are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Fixed

- Desktop bundles failed to compile: `CommandOutput` was not `Serialize`, so
  `tauri::generate_handler!` could not expand. A guard test now asserts every
  IPC type is serializable, catching this class of bug in `cargo test` rather
  than in a platform bundle job.
- Tauri's before-commands run from the app root, so `npm --prefix ../ui`
  resolved to a nonexistent path and every platform build failed.
- Release jobs could not decode the updater signing key; updater artifacts are
  now opt-in so installers publish regardless.

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

[Unreleased]: https://github.com/martin-k-m/orbit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/martin-k-m/orbit/releases/tag/v1.0.0
