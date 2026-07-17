# Troubleshooting

Common issues and how to resolve them. If none of these help, open an
[issue](https://github.com/martin-k-m/orbit/issues/new/choose).

## Orbit didn't find my project

Orbit detects a project by its manifest at the folder root (`Cargo.toml`,
`package.json`, `pyproject.toml`/`requirements.txt`, `go.mod`,
`docker-compose.yml`). Check that:

- the manifest is at the folder root, not nested deeper than the scan depth
  (default 4 levels below the folder you added);
- the project isn't inside an ignored directory (`node_modules`, `target`,
  `dist`, `.venv`, `vendor`, …), which Orbit deliberately skips;
- the folder still exists — projects whose folder moved are skipped from the
  list rather than shown broken.

Re-scan the parent folder to pick up changes.

## Git status is missing

Orbit reads git status by shelling out to the `git` binary. Make sure `git` is
installed and on your `PATH`. A folder that isn't a git repository simply shows
no git section — that's expected, not an error.

## A command won't run / is blocked

Commands assessed as **dangerous** (`rm -rf`, `dd`, `mkfs`, `curl | sh`, force
pushes, …) require confirmation. In the app, confirm the dialog; in the CLI,
pass `--yes`. If a command fails to start, check that its program (e.g. `cargo`,
`npm`, `docker`) is installed and on `PATH`.

## The app won't open on macOS

Pre-1.0 builds are not yet notarized. Right-click **Orbit** → **Open** the first
time to bypass Gatekeeper, or allow it under **System Settings → Privacy &
Security**.

## Windows SmartScreen warning

Unsigned pre-1.0 installers trigger SmartScreen. Choose **More info → Run
anyway**. If the app window is blank, ensure WebView2 is installed (the installer
adds it automatically; you can also install the Evergreen runtime from
Microsoft).

## Linux: app window is blank or won't start

Install the runtime dependencies:

```bash
sudo apt install libwebkit2gtk-4.1-0 libayatana-appindicator3-1
```

Some setups need `WEBKIT_DISABLE_COMPOSITING_MODE=1` to render correctly:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 ./Orbit_*.AppImage
```

## Resetting Orbit

Orbit's state is a single SQLite database in the app-data directory
(`com.orbit.dev`; see [configuration.md](./configuration.md#app-settings--data)).
Delete that folder to reset the app to a clean state. Your actual project folders
are never touched.

## Updates aren't appearing

Orbit checks GitHub Releases for updates. Update checks require network access;
if you're offline they're simply skipped. You can always download the latest
installer manually from the
[Releases](https://github.com/martin-k-m/orbit/releases/latest) page.

## Build from source fails on bundled SQLite

`orbit-core` builds SQLite from source, which needs a C toolchain. Install the
MSVC C++ build tools on Windows, or `gcc`/`clang` on macOS/Linux. On the Windows
GNU toolchain, ensure a MinGW `gcc` is on `PATH`.
