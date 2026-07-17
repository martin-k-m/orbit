# Workspaces

A project is more than a folder. It's the commands you actually run, the notes
you keep, the links you need and the terminals you had open. A **workspace** is
everything Orbit remembers about a project, so switching back restores your
context instead of making you rebuild it.

Workspaces are stored locally in Orbit's SQLite database, keyed by project. They
never touch your project folder and are never uploaded.

## What a workspace holds

| | |
| --- | --- |
| **Tasks** | Pinned, runnable commands. Seeded from what Orbit detects, then yours to edit. |
| **Notes** | Free-form Markdown — TODOs, setup steps, architecture decisions, debugging breadcrumbs. |
| **Bookmarks** | Links that belong to the project: docs, dashboards, the staging URL. |
| **Terminals** | Saved terminal tabs (title, shell, working directory). |

## Tasks

The first time you open a project, Orbit seeds its task list from the commands
it detected in the manifest — so a Rust project arrives with `dev`, `test`,
`build`, `check` and `lint` already there, and `dev`/`test`/`build` starred.

From there tasks are yours:

- **Add** anything: `docker compose up -d`, `npx prisma migrate dev`, a script.
- **Star** the ones you use constantly — favourites sort to the top.
- **Edit** a seeded task and it stays edited. Re-scanning never clobbers your
  changes; seeding only ever *adds* commands you don't already have.

### Tasks are safety-checked

Custom tasks go through the same guard as everything else Orbit runs. A task
like `rm -rf /` is assessed as **Dangerous** and refused unless you explicitly
confirm it:

```
confirmation required: Recursive, forced file deletion (rm -rf / del /s /q …);
Targets a root, home, or wildcard path — this can wipe large parts of the disk
```

See [Configuration](./configuration.md) for the full guard behaviour.

## Notes

Plain Markdown, stored per project. Useful for the things that don't belong in
the repo but that you always forget:

```markdown
# Setup
- [ ] `docker compose up -d` before running tests
- [ ] needs SENTRY_DSN in .env (ask the platform team)

## Gotchas
The migration job must run before seeding, or FK constraints blow up.
```

## Where it's stored

In the `workspaces` table of Orbit's local database (schema v2), as a JSON
document keyed by project id:

| OS | Location |
| --- | --- |
| macOS | `~/Library/Application Support/com.orbit.dev` |
| Windows | `%APPDATA%\com.orbit.dev` |
| Linux | `~/.local/share/com.orbit.dev` |

Deleting that folder resets Orbit — including workspaces. It never touches your
actual project folders.

## Workspace vs. project profile

Two different things, deliberately:

| | Workspace | `.project-orbit` profile |
| --- | --- | --- |
| Stored | Orbit's local database | In the repo |
| Scope | Just you, this machine | The whole team |
| For | Your notes, your terminals, your pinned tasks | The project's canonical name and commands |
| Committed | No | Yes |

Use a [profile](./configuration.md#project-profiles--project-orbit) to say "this
project's `dev` command is `cargo run --release`" for everyone. Use a workspace
for the stuff that's yours.

## Related

- [Configuration](./configuration.md)
- [Environment variables](./environment.md)
- [Roadmap](../ROADMAP.md) — the integrated terminal builds on this model.
