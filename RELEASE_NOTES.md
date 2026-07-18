# Orbit v1.4.3 — Release Notes

**A look-and-feel pass.** The chrome gets closer to a real IDE, the text reads
cleaner, and — finally — the Windows installer looks like it belongs to Orbit.

## What's new

### 🧰 A cleaner, IntelliJ-style top toolbar

The project toolbar was rebuilt to sit closer to IntelliJ's: a branded project
chip, a clickable **VCS widget** (branch, clean-or-changed, ahead/behind — it
opens Source Control), a green **Run** entry, and dense icon actions separated by
dividers.

### 🎨 Retuned text colours

The dark-theme text hierarchy is cleaned up — brighter, more neutral
primary/muted/subtle tones — so everything reads a touch crisper.

### 📦 A properly branded Windows installer

The Windows setup no longer looks like 2003. It now carries the **Orbit logo**
(installer icon + a branded header and welcome/finish sidebar on a dark panel)
and offers a **per-user / per-machine** choice. The installer artwork is
generated from the brand SVG at build time, so it always matches.

### 🧩 Integrations in Plugins

The Plugins view gained an **Integrations** section — the **AI provider** is the
first entry, showing its live connection status and linking straight to its
settings.

## Everything from v1.4.2, still here

The interactive VS Code-style status bar, the icon-only activity bar, the Plugins
view, the correct red app icon, and the code-signing pipeline (which signs macOS
+ Windows once you add signing certificates — see
[docs/SIGNING.md](https://github.com/martin-k-m/orbit/blob/main/docs/SIGNING.md)).

## Still to come

Cross-restart terminal sessions, the LSP go-to-definition/hover gestures, a
debugger, and a real plugin SDK — tracked in the
[roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).
