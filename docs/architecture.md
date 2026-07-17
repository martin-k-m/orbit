# Architecture

Orbit is a **local-first** developer command center. There is no backend
server, no account and no telemetry: every byte of state lives on the
developer's machine. The system is a small Rust engine wrapped by three thin
surfaces — a desktop app, a CLI and a marketing/docs site.

```
                          ┌──────────────────────────┐
                          │        orbit-core         │
                          │   (pure Rust engine/lib)   │
                          │                            │
                          │  scan · detect · profile   │
                          │  git · process · deps      │
                          │  health · analytics · store│
                          └────────────┬───────────────┘
                                       │  (Rust API)
                 ┌─────────────────────┼─────────────────────┐
                 │                     │                     │
        ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
        │   orbit-cli     │   │  orbit-desktop  │   │    (embeds)     │
        │  clap terminal  │   │   Tauri 2 app   │   │  same core in   │
        │   companion     │   │  React + TS UI  │   │  both surfaces  │
        └─────────────────┘   └────────┬────────┘   └─────────────────┘
                                       │ IPC (invoke/events)
                              ┌────────▼────────┐
                              │  React frontend │
                              │ Tailwind/shadcn │
                              └─────────────────┘

   apps/website  →  Next.js marketing site + documentation (static export)
```

## Design principles

1. **One engine, many surfaces.** All interesting logic — what a "project" is,
   how healthy it is, which commands it exposes — lives in `orbit-core`. The
   desktop app and the CLI are thin shells. This keeps behaviour identical
   everywhere and makes the logic unit-testable without a UI.
2. **Local-first, always.** No network on hot paths. Dependency inspection
   reads manifests on disk rather than calling a registry. Analytics never
   leave the machine.
3. **Degrade gracefully.** A folder that isn't a git repo, a machine without
   `git`, a moved project directory — none of these are errors. Functions
   return `Option`/empty rather than failing the whole operation.
4. **No heavy native deps in the core.** `orbit-core` shells out to the `git`
   binary instead of linking libgit2, and keeps its only C dependency (bundled
   SQLite) behind the optional `persistence` feature.

## Crate map

### `orbit-core` (`crates/orbit-core`)

The engine. Pure library, no `unsafe` (`unsafe_code = "forbid"`).

| Module        | Responsibility                                                        |
| ------------- | --------------------------------------------------------------------- |
| `model`       | The shared, `serde`-serializable data model (`Project`, `Command`, …). |
| `detect`      | Per-ecosystem manifest detection (Rust, Node, Python, Go, Docker).    |
| `scan`        | Walk a folder, find project roots, skip `node_modules`/`target`/etc.  |
| `profile`     | Read/write the human-editable `.project-orbit` TOML profile.          |
| `git`         | Repository status via the `git` CLI (branch, cleanliness, last commit).|
| `process`     | Spawn and run project commands; capture output.                        |
| `deps`        | List declared dependencies per ecosystem (offline).                    |
| `health`      | Heuristic 0–100 project-health score with concrete warnings.           |
| `analytics`   | Pure aggregation of local coding sessions and build times.             |
| `store`       | SQLite persistence (feature `persistence`): projects, settings, events.|

The data model uses `#[serde(rename_all = "camelCase")]` so it crosses the
Tauri IPC boundary into TypeScript with no translation layer — the same shapes
are the single source of truth for the frontend types.

### `orbit-cli` (`crates/orbit-cli`)

A `clap`-based terminal companion. Every subcommand maps to an `orbit-core`
call: `scan`, `info`, `health`, `deps`, `git`, `commands`, `run`, `init`. A
global `--json` flag emits machine-readable output for scripting. Formatting is
a tiny hand-rolled ANSI layer (respects `NO_COLOR`) — no heavy TUI dependency.

### `orbit-desktop` (`apps/desktop`)

A Tauri 2 application. Kept **outside** the Cargo workspace (see the root
`Cargo.toml` `exclude`) because it drags in the platform webview stack; it is
built on its own.

- `src-tauri/` — the Rust half. `lib.rs` wires plugins, opens the SQLite store
  in the OS app-data directory, installs the tray and native menu, and
  registers the command handlers in `commands.rs`. `state.rs` holds the shared
  `Store` and a process registry behind a `Mutex`.
- `ui/` — the React + TypeScript + Tailwind frontend. It talks to the backend
  through a typed IPC layer (`invoke`/`listen`) and falls back to seeded demo
  data when not running inside Tauri, so the UI renders in a browser too.

The IPC contract (command names and payload shapes) is documented in
`commands.rs`; the TypeScript mirror lives in `ui/src/lib/types.ts`.

### `orbit-web` (`apps/website`)

A Next.js 14 site configured for **static export** (`output: "export"`): the
product landing page plus the documentation. No backend; deployable to any
static host (GitHub Pages by default).

## Data & storage

Orbit stores everything in a single SQLite database in the platform app-data
directory (e.g. `%APPDATA%/com.orbit.dev` on Windows,
`~/Library/Application Support/com.orbit.dev` on macOS). Schema upgrades run
through a tiny embedded migration runner keyed on SQLite's `user_version`, so
they are ordered, idempotent and fully offline. WAL mode keeps the UI
responsive while analytics are written.

Tables: `projects`, `settings`, `sessions`, `builds`. A user's project folders
are never copied into the database — only their paths and lightweight metadata.

## Security posture

- No `unsafe` in the core.
- The desktop app ships a restrictive CSP and a scoped Tauri capability set
  (`src-tauri/capabilities/default.json`) granting only the permissions the UI
  actually uses.
- Commands run in the project's own directory with inherited environment; Orbit
  does not elevate privileges.

## Auto-update

The app ships the Tauri updater plugin, pointed at a `latest.json` published on
GitHub Releases and pinned to a committed minisign public key. Regular builds
keep `createUpdaterArtifacts: false` so they need no signing secrets; the
release workflow overlays `tauri.release.json` to turn artifact signing on and
signs with the private key from repository secrets. See
[docs/releasing.md](./releasing.md).
