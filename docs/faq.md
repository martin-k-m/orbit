# FAQ

## What is Orbit, in one sentence?

A local-first developer command center: it finds your projects, understands
them, and gives you one fast place to run commands, check git, watch project
health and see where your time goes.

## Does Orbit replace my editor?

No, and it isn't trying to. Orbit sits *beside* your editor and handles the
things around the code — switching projects, running commands, checking status.

## Does Orbit send my code anywhere?

No. Orbit has no server and no account. There is **no telemetry**. Dependency
inspection reads manifests on disk rather than calling a registry, and analytics
are aggregated locally and never leave your machine.

The only network feature is an optional update check against GitHub Releases,
which you can simply not use — installers work fine.

## Where does Orbit store my data?

One SQLite file in the platform app-data directory:

| OS | Location |
| --- | --- |
| macOS | `~/Library/Application Support/com.orbit.dev` |
| Windows | `%APPDATA%\com.orbit.dev` |
| Linux | `~/.local/share/com.orbit.dev` |

It holds the projects you added, your settings, your workspaces and the local
analytics log. Delete the folder to reset Orbit — your project folders are never
touched.

## Does Orbit modify my projects?

Only when you ask it to. The one file it will write is `.project-orbit`, and
only when you run "Generate profile" / `orbit init`. Everything else is
read-only inspection.

## Which languages does it detect?

Rust (`Cargo.toml`), TypeScript/JavaScript (`package.json`), Python
(`pyproject.toml` / `requirements.txt`), Go (`go.mod`) and Docker
(`docker-compose.yml`). It also picks up frameworks (Next.js, Axum, Django, …)
and your Node package manager from the lockfile.

Want another? [Adding a detected ecosystem](./contributing.md#adding-a-detected-ecosystem)
is the most common contribution and is a small, self-contained change.

## Why didn't it find my project?

Most often the manifest isn't at the folder root, or it's nested deeper than the
scan depth (4 levels), or it's inside an ignored directory (`node_modules`,
`target`, `dist`, `.venv`, `vendor`, …). See
[Troubleshooting](./troubleshooting.md#orbit-didnt-find-my-project).

## Is it safe to let Orbit run commands?

Orbit runs commands in the project's own directory with your normal privileges —
nothing is elevated. Before running anything it assesses the command, and
anything destructive (`rm -rf`, `dd`, `mkfs`, fork bombs, `curl | sh`, force
pushes, …) is **refused** unless you explicitly confirm it. That applies to
custom tasks you write, too.

## Why is the Linux download so much bigger?

The Linux artifact bundles both an `.AppImage` (which packs its own runtime) and
a `.deb`. The macOS and Windows installers are ~12–15 MB.

## Does auto-update work?

The updater is wired into the app, but v1.0.0 does **not** publish signed update
artifacts — that needs an updater signing key. Update checks no-op safely, and
installers are the supported path. See [Releasing](./releasing.md) to enable it.

## macOS says the app is damaged / from an unidentified developer

Pre-1.0 builds aren't notarized yet. Right-click **Orbit → Open** the first
time, or allow it in **System Settings → Privacy & Security**.

## Is Orbit free? What's the licence?

Yes — [MIT](../LICENSE). Free and open source, no paid tier.

## What about Docker / database / API features?

Not built yet. The terminal **is** built — every project has a real PTY-backed
shell (see [terminal.md](./terminal.md)); tabs, splits, search and
survive-a-restart sessions are still to come. The [ROADMAP](../ROADMAP.md) marks exactly what's shipped (✅),
in progress (🚧) and planned (📋) — deliberately honest, so you can tell what
you're downloading. v1.0 is the foundation: projects, commands, git, health,
dependencies, analytics, env files and workspaces.

## How do I report a bug or ask for a feature?

[Open an issue](https://github.com/martin-k-m/orbit/issues/new/choose) or start
a [discussion](https://github.com/martin-k-m/orbit/discussions). For security
issues, please report privately — see [SECURITY.md](../SECURITY.md).

## Can I contribute?

Please do — see [Contributing](./contributing.md). The engine
(`crates/orbit-core`) is pure Rust and unit-tested without a UI, so it's an easy
place to start.
