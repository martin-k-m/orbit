# Orbit v1.4.2 — Release Notes

**An IDE-chrome polish pass.** Small, tasteful refinements that make Orbit feel
tighter and more native — building on the v1.4.1 redesign.

## What's new

### 📊 A richer status bar

The bottom status bar is now a proper VS Code-style bar:

- The **git branch** and **AI** chips are clickable and open their tool windows.
- It shows the current **indent width** alongside the caret position, encoding,
  line ending and language.
- Every segment has a hover state, so it reads as interactive, not decorative.

### ⌨️ Keyboard focus rings & hover feedback

Interactive controls now show a clean **focus ring** for keyboard users, and the
activity bar and bottom tool-window strip gained consistent **hover feedback** —
the small touches that make an app feel finished.

## Everything from v1.4.1, still here

The icon-only activity bar, the context-aware title bar, the Plugins view, the
correct red app icon, and the code-signing pipeline (which signs macOS + Windows
once you add signing certificates — see
[docs/SIGNING.md](https://github.com/martin-k-m/orbit/blob/main/docs/SIGNING.md)).

## Still to come

Cross-restart terminal sessions, the LSP go-to-definition/hover gestures, a
debugger, and a real plugin SDK — tracked in the
[roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).
