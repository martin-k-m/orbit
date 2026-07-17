# Development

This guide gets you from a fresh clone to a running Orbit desktop app.

## Prerequisites

| Tool            | Version | Notes                                                        |
| --------------- | ------- | ------------------------------------------------------------ |
| Rust            | ≥ 1.77  | Install via [rustup](https://rustup.rs). Includes `cargo`.   |
| Node.js         | ≥ 18    | For the desktop frontend and the website.                    |
| A C toolchain   | any     | Needed to build bundled SQLite (MSVC on Windows, clang/gcc). |
| Tauri prereqs   | —       | See the [Tauri 2 prerequisites](https://tauri.app/start/prerequisites/) for your OS (WebView2 on Windows, Xcode CLT on macOS, webkit2gtk on Linux). |
| Git             | any     | Orbit shells out to `git` for repository status.             |

Install the Tauri CLI once:

```bash
cargo install tauri-cli --version "^2"
```

## Repository layout

```
orbit/
├── Cargo.toml            # workspace: orbit-core + orbit-cli
├── apps/
│   ├── desktop/          # Tauri app (its own crate, excluded from the workspace)
│   │   ├── src-tauri/    # Rust backend
│   │   └── ui/           # React + TypeScript frontend
│   └── website/          # Next.js marketing site + docs
├── crates/
│   ├── orbit-core/       # the engine (library)
│   └── orbit-cli/        # terminal companion (binary `orbit`)
├── packages/             # shared, reusable packages
├── scripts/              # release & tooling helpers
├── docs/                 # architecture, development, contributing
└── .github/workflows/    # test · build · release · website
```

## The engine and the CLI

Everything except the desktop app lives in one Cargo workspace and builds with
plain `cargo`:

```bash
# From the repo root
cargo build                 # build orbit-core + orbit-cli
cargo test                  # run the engine's unit tests
cargo clippy --all-targets  # lint
cargo fmt --all             # format

# Try the CLI
cargo run -p orbit-cli -- scan ~/code
cargo run -p orbit-cli -- info .
cargo run -p orbit-cli -- health . --json
```

> **Windows + GNU toolchain:** if you use the `x86_64-pc-windows-gnu` toolchain
> you need a MinGW `gcc` on `PATH` for bundled SQLite. The MSVC toolchain uses
> the Visual Studio C++ build tools instead. CI uses the platform default.

## The desktop app

The desktop app is a separate crate. Run it in development with hot-reloading
frontend:

```bash
# Install frontend deps once
npm --prefix apps/desktop/ui install

# Generate the app icons (first time only; needs the Tauri CLI)
cargo tauri icon apps/desktop/src-tauri/icons/app-icon.png \
  --output apps/desktop/src-tauri/icons

# Run the app (starts Vite, then the Tauri shell)
cargo tauri dev --config apps/desktop/src-tauri/tauri.conf.json
```

`cargo tauri dev` runs `beforeDevCommand` (`npm --prefix ../ui run dev`), waits
for Vite on `localhost:5173`, then launches the native window pointed at it.

Build a production bundle:

```bash
cargo tauri build --config apps/desktop/src-tauri/tauri.conf.json
```

Installers land in `apps/desktop/src-tauri/target/release/bundle/`.

### Frontend only

The React UI degrades gracefully outside Tauri: when `__TAURI_INTERNALS__` is
absent it serves seeded demo data. That means you can iterate on the UI in a
plain browser:

```bash
npm --prefix apps/desktop/ui run dev
# open http://localhost:5173
```

## The website

```bash
npm --prefix apps/website install
npm --prefix apps/website run dev      # http://localhost:3000
npm --prefix apps/website run build    # static export to apps/website/out/
```

## Testing philosophy

The valuable logic lives in `orbit-core`, and that is where the tests live —
detection, profile round-tripping, health scoring, analytics aggregation and
storage all have unit tests that run without a UI or a network. Add tests there
when you change behaviour; keep the desktop/CLI layers thin enough that they
don't need their own.

```bash
cargo test -p orbit-core
```

## Common tasks

| Task                              | Command                                                   |
| --------------------------------- | --------------------------------------------------------- |
| Add a new detected ecosystem      | Extend `crates/orbit-core/src/detect.rs` + tests          |
| Add a new Tauri command           | Add to `commands.rs`, register in `lib.rs`, mirror in `ui/src/lib/ipc.ts` |
| Change the data model             | Edit `model.rs`, update `ui/src/lib/types.ts` to match     |
| Add a CLI subcommand              | Extend the `Commands` enum in `orbit-cli/src/main.rs`      |
