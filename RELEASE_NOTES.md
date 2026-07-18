# Orbit v1.4.0 — Release Notes

**Toward an AI-native IDE.** Orbit gains a local-first AI assistant, a commit
graph, a much stronger terminal, and split editors — while staying exactly what
it's always been: local-first, no account, no telemetry, fast, and
cross-platform.

## Highlights

### 🤖 A local-first AI assistant

A new **AI** tool window brings a project-aware chat right into the workspace,
backed by **any OpenAI-compatible endpoint** you choose in Settings → AI:

- A **local runtime** (Ollama, LM Studio, a llama.cpp server) or a hosted
  provider — one code path serves both.
- **Off by default.** The endpoint, model and key are stored only on your
  device, and Orbit contacts nothing until you enable it and send a message.
- Built on a new, unit-tested `orbit_core::ai` module.

### 🌱 Commit graph

The Source Control history now draws a real **commit-graph rail** — a lane per
branch with a node in each commit's lane — so you can read branch and merge
structure at a glance. The lane layout is a pure, unit-tested function.

### 🖥 Terminal 3.0

The integrated terminal grows real IDE ergonomics:

- **In-terminal find** (Ctrl/Cmd+F, next/previous).
- A **side-by-side split** — watch a build in one pane, work in another.
- **Shell profiles** — the `＋` has a menu of the shells Orbit found, and each
  tab is labelled with the shell it launched.

### ⬌ Split editors

The editor **splits side by side** — open a second file next to the first, or
the same file twice. Both panes share one document model, so a file open in both
edits a single draft with one unsaved state.

### 🧹 Ecosystem plumbing removed

The last of the Blink/Killer/Flux/Beacon sibling-detection is gone from the app
and the website — Orbit no longer carries integrations that never had a real
engine behind them.

## Under the hood

New unit-tested engine work (`orbit_core::ai`, the git commit-graph lane
layout), the xterm search addon for terminal find, and a small editor-store
change that gives split editors a shared document model for free. The engine
test suite stays green and the desktop bundle builds on macOS (Intel + Apple
Silicon), Windows and Linux.

## Still to come

Cross-restart terminal sessions, the LSP go-to-definition/hover gestures, a
debugger, and a plugin SDK — tracked honestly in the
[roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).
