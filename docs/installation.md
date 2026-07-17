# Installation

Orbit runs entirely on your machine. No account or connection is required after
download.

## Download

Get the latest installer from the
[Releases](https://github.com/martin-k-m/orbit/releases/latest) page.

## macOS

1. Download the `.dmg` for your chip:
   - **Apple Silicon** (M1/M2/M3/M4): the `aarch64` build.
   - **Intel**: the `x86_64` build.
2. Open the `.dmg` and drag **Orbit** to Applications.
3. On first launch, right-click Orbit → **Open** (the pre-1.0 builds are not yet
   notarized, so Gatekeeper asks for confirmation the first time).

Minimum: macOS 10.15+.

> **Notarization (maintainers):** production releases will be signed with a
> Developer ID certificate and notarized. See
> [releasing.md](./releasing.md#macos-signing--notarization).

## Windows

1. Download the `.msi` (recommended) or the `.exe` (NSIS) installer.
2. Run it. Orbit installs to your user profile and adds a Start Menu entry; the
   installer offers to create a desktop shortcut.
3. Uninstall any time from **Settings → Apps** or the Start Menu entry.

If Windows SmartScreen appears (unsigned pre-1.0 builds), choose
**More info → Run anyway**. WebView2 is installed automatically if missing.

## Linux

Pick the format your distro prefers:

- **AppImage** — download, `chmod +x Orbit_*.AppImage`, and run it. Portable, no
  install.
- **.deb** — `sudo apt install ./orbit_*.deb` on Debian/Ubuntu derivatives.

Runtime dependencies: `webkit2gtk-4.1` and `libayatana-appindicator3`. On
Ubuntu:

```bash
sudo apt install libwebkit2gtk-4.1-0 libayatana-appindicator3-1
```

## The CLI

The `orbit` CLI is a separate, tiny binary that shares the same engine:

```bash
# From a clone of the repo
cargo install --path crates/orbit-cli
orbit --help
```

## Building from source

See [development.md](./development.md) for prerequisites and the full build
instructions for the app, the CLI and the website.

## Verifying and updating

Orbit checks for updates on launch and can download and install them in place
(signed via the Tauri updater). You can always re-download the latest installer
from the Releases page.

## Uninstalling

- **macOS:** delete `Orbit.app` from Applications. Local data lives in
  `~/Library/Application Support/com.orbit.dev`.
- **Windows:** uninstall from Settings → Apps. Data lives in
  `%APPDATA%\com.orbit.dev`.
- **Linux:** remove the AppImage or `sudo apt remove orbit`. Data lives in
  `~/.local/share/com.orbit.dev`.
