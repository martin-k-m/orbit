# Orbit v1.4.1 — Release Notes

**A proper-IDE design pass.** Orbit's chrome moves closer to VS Code / IntelliJ,
the installers finally carry the right logo, and the release pipeline is ready to
ship warning-free, signed builds.

## Highlights

### 🎛 A slim, icon-only activity bar

The left navigation is now a **VS Code-style activity bar** — icons only, a
fraction of its old width, with tooltips and an accent rail on the active item.
More room for your code, less chrome.

### 🧭 Context in the title bar, not branding

The title bar drops the marketing banner and shows **what you're looking at** —
the current project or view — the way a real IDE does. The old "Command Center"
header and spinning logo are gone; you know what app you're in.

### 🧩 Plugins

A new **Plugins** destination presents Orbit's built-in capabilities as
extensions and previews the community marketplace that's on the roadmap (marked
honestly as coming, not pretend-installed).

### 🎨 The right icon

The installers and the app now carry the current **red Orbit logo** — CI
regenerates the full icon set (`.ico` / `.icns` / PNGs) from the brand SVG at
build time, so no more stale purple raster.

### 🔏 Signed, warning-free installs (when certs are provided)

The release workflow now **signs and notarizes macOS** and **signs Windows**
automatically — which removes the "unidentified developer" / SmartScreen prompts
— **as soon as signing certificates are added as repository secrets**. See
[docs/SIGNING.md](https://github.com/martin-k-m/orbit/blob/main/docs/SIGNING.md)
for exactly what to add.

> **Note:** OS-level code signing requires paid certificates that only the
> project owner can obtain (an Apple Developer ID for macOS; an OV/EV
> code-signing certificate for Windows). Until those are added, these builds ship
> **unsigned** and your OS will still warn on first launch — that's a property of
> any unsigned binary, not of Orbit. The pipeline is wired to sign automatically
> the moment the certificates exist.

## Everything from v1.4.0, still here

The local-first AI assistant, the commit graph, Terminal 3.0 (search / splits /
profiles), split editors, and the full IDE beneath them.

## Still to come

Cross-restart terminal sessions, the LSP go-to-definition/hover gestures, a
debugger, and a real plugin SDK — tracked in the
[roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).
