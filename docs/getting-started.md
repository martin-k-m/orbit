# Getting started

Welcome to Orbit — a local-first developer command center. This guide takes you
from install to your first scanned project in a couple of minutes.

## 1. Install

Download the installer for your platform from the
[Releases](https://github.com/martin-k-m/orbit/releases/latest) page and run it.
See [installation.md](./installation.md) for per-platform details, or build from
source with [development.md](./development.md).

Prefer the terminal? Install the CLI companion:

```bash
cargo install --path crates/orbit-cli   # binary: `orbit`
```

## 2. Add your first projects

Open Orbit and press **Add project** (or `Cmd/Ctrl + K` → "Add project"). Pick a
folder — either a single project or a parent folder that contains several. Orbit
scans it and detects every Rust, TypeScript/JavaScript, Python, Go and Docker
project inside, skipping `node_modules`, `target` and friends.

Each detected project shows its language, framework, git status, dependency
count and the commands Orbit can run.

## 3. Run a command

Open a project and go to the **Commands** tab (or use the palette). Orbit infers
commands from the project's manifest — `cargo run`, `npm run dev`, `go test`,
`docker compose up`, and so on. Click one to run it; output is captured and
shown inline.

> Commands that look destructive (`rm -rf`, `dd`, `curl | sh`, …) are flagged
> and require confirmation before Orbit will run them.

## 4. Pin the commands you care about

Create a project profile so Orbit runs exactly what you want:

```bash
orbit init            # writes a .project-orbit file for the current project
```

Edit the generated `.project-orbit` (see [configuration.md](./configuration.md))
to set the project's display name and commands. Orbit picks it up on the next
scan.

## 5. Explore

- **Health** — a 0–100 score with concrete warnings (big files, TODOs, missing
  tests).
- **Dependencies** — everything declared across the project's ecosystems.
- **Analytics** — local, private time-per-language and build-time stats.
- **Ecosystem** — integrations with Blink, Killer, Flux and Beacon.

## Keyboard shortcuts

| Shortcut          | Action                 |
| ----------------- | ---------------------- |
| `Cmd/Ctrl + K`    | Open the command palette |
| `Esc`             | Close palette / dialog |

## Next steps

- [Installation](./installation.md)
- [Configuration & profiles](./configuration.md)
- [CLI reference](./cli.md)
- [Troubleshooting](./troubleshooting.md)
