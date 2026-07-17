# Contributing

The full contributor guide lives in [docs/contributing.md](docs/contributing.md),
and setup instructions are in [docs/development.md](docs/development.md).

Quick version:

```bash
cargo fmt --all
cargo clippy --all-targets -- -D warnings
cargo test
```

Open an issue before non-trivial work, branch from `main`, add tests in
`orbit-core`, and keep Orbit local-first (no telemetry, no required account).
