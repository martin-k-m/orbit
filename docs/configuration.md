# Configuration

Orbit is configured in two places: **project profiles** (per-project, checked
into the repo) and **app settings** (per-machine, stored locally).

## Project profiles — `.project-orbit`

A profile is a small TOML file at the root of a project. It lets you override
the project's display name and pin the exact commands Orbit should run,
regardless of what the detector guessed. Generate one with:

```bash
orbit init            # or the "Generate profile" action in the app
```

### Format

```toml
# .project-orbit
[project]
name = "API Server"
description = "The backend service"

[commands]
dev   = "cargo run"
test  = "cargo test"
build = "cargo build --release"
lint  = "cargo clippy -- -D warnings"
```

- **`[project].name`** — display name in Orbit (defaults to the folder name).
- **`[project].description`** — one-line description shown on the project card.
- **`[commands]`** — a table of `name = "program args…"`. The first token is the
  program, the rest are arguments. Profile commands **override** detected
  commands with the same name and are marked as coming from the profile.

Commit `.project-orbit` to share the setup with your team; everyone's Orbit then
runs the same commands.

## What Orbit detects automatically

If there is no profile (or for command names it doesn't define), Orbit infers
commands from the ecosystem's manifest:

| Ecosystem | Detected from                       | Example commands                     |
| --------- | ----------------------------------- | ------------------------------------ |
| Rust      | `Cargo.toml`                        | `cargo run`, `cargo test`, `cargo build --release` |
| Node/TS   | `package.json` (`scripts`)          | every script, plus `dev`/`build`/`test` |
| Python    | `pyproject.toml` / `requirements.txt` | `pytest`, `ruff check`, install    |
| Go        | `go.mod`                            | `go run .`, `go test ./...`, `go build ./...` |
| Docker    | `docker-compose.yml`                | `docker compose up/down/logs`        |

The package manager for Node projects is chosen from the lockfile
(`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, else npm).

## App settings & data

Orbit stores its own state in a single SQLite database in the platform app-data
directory:

| OS      | Location                                        |
| ------- | ----------------------------------------------- |
| macOS   | `~/Library/Application Support/com.orbit.dev`    |
| Windows | `%APPDATA%\com.orbit.dev`                        |
| Linux   | `~/.local/share/com.orbit.dev`                   |

It holds the projects you added, your settings (theme, etc.) and the local
analytics event log. It is never uploaded anywhere. Deleting the folder resets
Orbit to a clean state; it does not touch your actual project folders.

## Privacy

Orbit makes no network requests on its hot paths and has no telemetry. The only
network feature is the optional update check against GitHub Releases.
