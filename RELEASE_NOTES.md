# Orbit v1.0.0 — Release Notes

**The first public release of Orbit.** A local-first developer command center
for managing projects, tools and workflows — no server, no account, no
telemetry.

## Highlights

### 🗂 Project management

- Point Orbit at any folder and it detects every **Rust, TypeScript/JavaScript,
  Python, Go and Docker** project inside, with the right commands, frameworks
  and dependency counts.
- Add, pin and organise projects on a dashboard that remembers what you opened
  last.
- Human-editable `.project-orbit` profiles let you pin a project's name and the
  exact commands Orbit should run.

### ⌘ Command center

- A `Cmd/Ctrl + K` command palette to jump to any project, run `dev`/`build`/
  `test`, open a terminal, or scan a folder — without leaving the keyboard.
- Native application menu and a system tray with quick access.

### ▶️ Run & inspect

- One-click running of a project's commands, with captured output.
- **Git at a glance:** branch, cleanliness, ahead/behind and last commit.
- **Project health:** a 0–100 score with concrete warnings (oversized files,
  TODOs, heavy artifacts, missing tests).
- **Dependency manager:** the declared dependencies of every ecosystem, read
  offline from manifests.
- **Developer analytics:** local, private time-per-language and build-time
  tracking that never leaves your machine.

### 🛰 Ecosystem integrations

Previews for the sibling tools **Blink** (acceleration), **Killer** (security),
**Flux** (automation) and **Beacon** (APIs).

### 🔒 Safety & privacy

- No network on hot paths. Analytics stay local.
- A **dangerous-command guard** flags destructive commands (`rm -rf`, `dd`,
  `mkfs`, fork bombs, `curl | sh`, …) and requires explicit confirmation before
  running them.
- Restrictive Content-Security-Policy and a minimal Tauri capability set.
  `orbit-core` forbids `unsafe` code.

### ⌨️ CLI companion

The same engine as a terminal binary: `orbit scan | info | health | deps | git |
commands | run | init`, all with `--json`.

### 🔄 Auto-update

The desktop app can check for, download and install updates from GitHub
Releases, with signed update artifacts.

## Downloads

| Platform | Files |
| --- | --- |
| macOS (Apple Silicon & Intel) | `.dmg` |
| Windows | `.msi`, `.exe` |
| Linux | `.AppImage`, `.deb` |

## Install

See [docs/installation.md](docs/installation.md). Everything runs locally; no
account or connection required.

## Breaking changes

None — this is the first release.

## Migration notes

None.

## Known limitations

- Ecosystem integrations (Blink/Killer/Flux/Beacon) ship as clearly-labelled
  previews; connecting the real engines is on the roadmap.
- Dependency "update available" hints are planned for a follow-up release.

## Thanks

Built for developers who want their tools to stay on their machine. ✦
