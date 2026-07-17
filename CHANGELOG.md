# Changelog

All notable changes to Orbit are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Website:** a dedicated `/download` page with per-architecture installers
  (macOS Apple Silicon + Intel, Windows MSI/EXE, Linux AppImage/deb), and new
  `Configuration` and `Troubleshooting` documentation pages.

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
- **Auto-update** — the desktop app checks for, downloads and installs signed
  updates from GitHub Releases (Tauri updater).
- **`orbit-web`** — a Next.js marketing site and documentation, static-exported.
- **CI/CD** — GitHub Actions split into `test`, `build`, `release` and
  `website` workflows, building installers for macOS (Intel + Apple Silicon),
  Windows and Linux.

[Unreleased]: https://github.com/martin-k-m/orbit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/martin-k-m/orbit/releases/tag/v1.0.0
