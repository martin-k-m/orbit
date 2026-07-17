# Contributing to Orbit

Thanks for your interest in Orbit! This document explains how to propose
changes. For environment setup see [development.md](./development.md).

## Ground rules

- **Be kind.** We follow the spirit of the
  [Contributor Covenant](https://www.contributor-covenant.org/). Assume good
  faith; keep discussion technical and respectful.
- **Local-first is non-negotiable.** Orbit does not phone home. Any change that
  introduces a network call on a hot path, telemetry, or a required account
  will be declined. Optional, explicit, user-initiated network features (e.g.
  "check for updates") are fine.
- **Keep the core pure.** New logic belongs in `orbit-core` with tests, not in
  the desktop or CLI layers.

## Workflow

1. **Open an issue first** for anything non-trivial so we can agree on the
   approach before you spend time on it.
2. **Fork and branch.** Use a descriptive branch name, e.g.
   `feat/python-poetry-detection` or `fix/git-detached-head`.
3. **Make the change** with tests.
4. **Run the checks locally** (see below) — CI runs the same ones.
5. **Open a pull request** against `main`. Fill in the template. Link the issue.
6. A maintainer reviews. Squash-merge is the default.

## Before you push

```bash
cargo fmt --all
cargo clippy --all-targets -- -D warnings
cargo test
```

For desktop frontend changes:

```bash
npm --prefix apps/desktop/ui run build   # UI typechecks + builds
```

CI will not go green unless formatting, Clippy (warnings denied), tests and the
frontend build all pass. (The marketing site lives in the separate
[`orbit-web`](https://github.com/martin-k-m/orbit-web) repo.)

## Commit messages

We loosely follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): detect Bun projects via bun.lockb
fix(cli): handle projects with no default run target
docs: clarify Windows GNU toolchain SQLite requirement
```

Type prefixes we use: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
`ci`, `perf`.

## Code style

- **Rust:** `rustfmt` defaults; Clippy clean; document public items; no
  `unsafe` (it is forbidden in `orbit-core`). Prefer returning typed errors
  (`orbit_core::Error`) over `unwrap` in library code.
- **TypeScript:** strict mode; no `any` without a justifying comment; component
  files in PascalCase; keep the IPC types in `ui/src/lib/types.ts` in lock-step
  with the Rust model.
- **Design:** dark-first, consistent with the existing tokens (indigo/violet
  accents, glass panels). Respect `prefers-reduced-motion`.

## Adding a detected ecosystem

The most common contribution. To teach Orbit a new stack:

1. Add its root marker(s) to `ROOT_MARKERS` in `detect.rs`.
2. Write a `detect_<lang>` function returning an `Ecosystem` with sensible
   `Convention` commands and a framework hint.
3. Add dependency parsing in `deps.rs` if the manifest is machine-readable.
4. Add a unit test in `lib.rs`'s `tests` module using a `tempfile` fixture.

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities. See
[SECURITY.md](../SECURITY.md) for private disclosure instructions.

## License

By contributing you agree that your contributions are licensed under the
project's [MIT License](../LICENSE).
