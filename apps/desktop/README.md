# orbit-desktop

The Orbit desktop application — a [Tauri 2](https://tauri.app) shell around the
`orbit-core` engine with a React + TypeScript frontend.

```
orbit-desktop/
├── src-tauri/      # Rust backend: commands, state, tray, menu, SQLite store
│   ├── src/
│   │   ├── main.rs        # binary entry point
│   │   ├── lib.rs         # app setup: plugins, store, tray, menu, handlers
│   │   ├── commands.rs    # the invoke() command surface (the IPC contract)
│   │   └── state.rs       # shared AppState (store + process registry)
│   ├── capabilities/      # Tauri permission scopes
│   ├── icons/             # generated app icon set (source: app-icon.png)
│   └── tauri.conf.json
└── ui/             # React + TypeScript + Tailwind frontend (see ui/README.md)
```

This crate is intentionally **outside** the top-level Cargo workspace (see the
root `Cargo.toml` `exclude`) because it pulls in the platform webview stack.
Build it on its own with the Tauri CLI.

## Develop

```bash
# from the repository root
npm --prefix apps/desktop/ui install
cargo tauri dev --config apps/desktop/src-tauri/tauri.conf.json
```

## Build installers

```bash
cargo tauri build --config apps/desktop/src-tauri/tauri.conf.json
```

Artifacts land in `src-tauri/target/release/bundle/`.

## The IPC contract

The React UI calls the backend through `invoke(...)`; the command names, their
arguments and their return shapes are defined in
[`src-tauri/src/commands.rs`](src-tauri/src/commands.rs) and mirrored in
[`ui/src/lib/types.ts`](ui/src/lib/types.ts). Keep the two in sync when changing
the data model. The frontend also serves seeded demo data when it detects it is
running outside Tauri, so you can iterate on the UI in a plain browser.

## Icons

The icon set in `src-tauri/icons/` is generated from `icons/app-icon.png`. To
regenerate after editing the source image:

```bash
cargo tauri icon apps/desktop/src-tauri/icons/app-icon.png \
  --output apps/desktop/src-tauri/icons
```
