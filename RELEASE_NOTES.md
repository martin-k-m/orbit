# Orbit v1.3.1 — Release Notes

**Finishing touches on the IntelliJ-style tool-window system.** A small,
UI-only follow-up to v1.3.0 that gives the workspace the layout affordances a
real IDE has.

Still everything you'd expect: local-first, no account, no telemetry, fast, and
cross-platform.

## What's new

### ↕ Resizable tool windows

The bottom tool-window dock (Problems, Git, Search, Testing, Terminal, …) can now
be **resized by dragging its top edge**. The height is clamped to a usable range
and **remembered across restarts**.

### ◧ Collapsible file tree

The editor's left Explorer now **collapses to a thin rail** and expands again, so
you can hand the full width to your code when you want it.

### 🧠 A layout that remembers

The docked tool window, the dock height and the file-tree state now **persist**:
the docked tool and tree survive switching between projects, and the sizes and
visibility survive relaunching — instead of resetting every time you open a
project.

## Under the hood

A pure UI/layout release — no engine changes. A new, unit-tested workspace-layout
store drives the above; the 100+ `orbit_core` tests stay green and the desktop
bundle builds on macOS (Intel + Apple Silicon), Windows and Linux.

## Everything from v1.3.0, still here

The IntelliJ-style workspace — a permanent editor centre with a docked bottom
tool-window strip, a live status bar, and flat professional chrome — plus the
full IDE from v1.2.0: multi-file editing, search, the git power center,
Containers · Database · APIs, testing, and live language-server diagnostics.

## Still to come

Split editors, the LSP go-to-definition/hover gestures, a debugger, and a plugin
SDK — tracked honestly in the [roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).
