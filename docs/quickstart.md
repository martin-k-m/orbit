# Quickstart

Orbit, from zero to useful, in about two minutes.

## 1. Install

Download the installer for your platform from
[Releases](https://github.com/martin-k-m/orbit/releases/latest) and run it.
Details per platform: [installation.md](./installation.md).

Prefer the terminal? `cargo install --path crates/orbit-cli` gives you `orbit`.

## 2. Add your code folder

Open Orbit → **Add project** (or `⌘/Ctrl + K` → "Add project") → pick the folder
your code lives in, e.g. `~/code`.

Point it at the **parent** folder, not a single project. Orbit scans up to four
levels deep and finds everything, skipping `node_modules`, `target`, `dist` and
friends.

```console
$ orbit scan ~/code
✔ 5 projects under ~/code

  api-server              Rust
  web-app                 TypeScript
  worker                  Go
  scanner                 Rust
  orbit                   Rust
```

## 3. Look at a project

Click one. You get, at a glance:

- **Language & framework** — detected from the manifest.
- **Git** — branch, clean/dirty, ahead/behind, last commit.
- **Health** — a 0–100 score and the specific things dragging it down.
- **Dependencies** — everything declared, read offline.
- **Commands** — what you can run, inferred from the manifest.

## 4. Run something

Hit a command — `dev`, `test`, `build`. Output comes back inline.

Anything destructive is refused until you confirm it:

```console
$ orbit run clean
! This command looks dangerous:
  ! Recursive, forced file deletion (rm -rf / del /s /q …)
✖ refusing to run `rm -rf target` without --yes
```

## 5. Make it yours

**Pin your own tasks.** The task list starts seeded from detected commands. Add
`docker compose up -d`, a migration script, whatever you actually run. Star the
ones you use constantly.

**Keep notes.** Markdown per project — setup steps, gotchas, TODOs. See
[workspace.md](./workspace.md).

**Check your `.env`.** Orbit lists every environment file, masks secrets, and
flags duplicates and variables your `.env.example` promises but your `.env` is
missing. See [environment.md](./environment.md).

## 6. Share the setup with your team

Pin the project's canonical commands in a committed profile:

```bash
orbit init          # writes .project-orbit
```

```toml
# .project-orbit
[project]
name = "API Server"
description = "The backend service"

[commands]
dev   = "cargo run --release"
test  = "cargo test"
```

Commit it and everyone's Orbit runs the same commands. See
[configuration.md](./configuration.md).

## Shortcuts

| | |
| --- | --- |
| `⌘/Ctrl + K` | Command palette — jump anywhere, run anything |
| `Esc` | Close palette / dialog |

## Where next

- [Getting started](./getting-started.md) — the longer walkthrough
- [Workspaces](./workspace.md) · [Environment](./environment.md) · [CLI](./cli.md)
- [FAQ](./faq.md) · [Troubleshooting](./troubleshooting.md)
- [ROADMAP](../ROADMAP.md) — what's shipped vs. planned
