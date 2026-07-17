# Handoff — engineering context

A ground-truth snapshot for whoever (or whatever) picks up Orbit next. This is
the honest state, including the things the marketing pages don't say. If it
conflicts with a glossier doc, trust this file and fix the other one.

Last updated at **v1.1.0**.

---

## The two repositories (never merge them)

- **`orbit`** (this repo) — the app: Rust engine, CLI, and the Tauri desktop
  app. Nothing marketing lives here.
- **`orbit-web`** (separate repo, `github.com/martin-k-m/orbit-web`) — the
  Next.js website + docs pages. Deploys to GitHub Pages at the **custom domain
  `https://orbit.blinkdev.me`** (there is a `public/CNAME`; `basePath` must stay
  empty because it serves at the domain root). A local clone typically sits at
  `../orbit-web`.

This split was a hard-won correction — the website used to live in `apps/website`
and had to be extracted. Do not put website code in `orbit`.

## Layout

```
orbit/
├── crates/
│   ├── orbit-core/      # the engine — pure Rust, no UI, fully unit-tested
│   └── orbit-cli/       # `orbit` binary, thin shell over the engine
├── apps/
│   └── desktop/
│       ├── src-tauri/   # Tauri 2 Rust backend (OUTSIDE the cargo workspace)
│       └── ui/          # React + TS + Tailwind frontend
├── packages/            # reserved, empty
├── scripts/             # bump-version.sh, check.sh, gen-icons.sh
└── docs/                # user + contributor docs
```

`apps/desktop/src-tauri` is intentionally **excluded** from the workspace
(`Cargo.toml` `exclude`) because it drags in the webview stack.

## What actually exists (v1.1.0)

Engine modules (`crates/orbit-core/src/`), all unit-tested:

| Module | Does |
| --- | --- |
| `scan` / `detect` | Find projects, detect ecosystem (Rust/TS/JS/Python/Go/Docker) |
| `model` | The shared serde data model (the IPC contract's source of truth) |
| `profile` | `.project-orbit` TOML read/write |
| `git` | Status via the `git` CLI (no libgit2) |
| `process` | Run project commands, capture output |
| `deps` | Offline dependency listing |
| `health` | 0–100 project health score |
| `analytics` | Local time/build aggregation |
| `safety` | Dangerous-command assessment (`rm -rf`, `dd`, `curl \| sh`, …) |
| `env` | `.env` discovery/parsing, secret masking, dup/missing detection |
| `workspace` | Per-project tasks/notes/bookmarks/terminal tabs (JSON in SQLite) |
| `shell` | Which shells exist + which the user prefers |
| `files` | Lazy dir listing + file read (encoding/line-ending/language/binary) |
| `store` | SQLite persistence (feature `persistence`, schema v2) |

Desktop features that are **built and wired to the UI**:

- Project dashboard, command palette (⌘/Ctrl+K), project detail views
- Git status, health, dependency panels
- Command runner (safety-guarded), workspace tasks/notes
- **Integrated terminal** — real PTY (`portable-pty`), xterm.js UI
- **File explorer + CodeMirror 6 editor** (Explorer tab)
- Environment report; local analytics
- System tray, native menu, Dark/Light/**System** theme (persisted)
- **Signed auto-update** (from v1.1.0)

Ecosystem integrations (Blink/Killer/Flux/Beacon) are **UI previews only** — no
real engines behind them.

## What does NOT exist (despite what big spec prompts asked for)

Be very clear about this — do not claim otherwise in any doc or the UI:

- **No LSP / semantic code intelligence** — the editor is syntactic only. No
  go-to-definition, find-references, rename, hover types, real diagnostics.
- **No debugger (DAP)**, no test-runner UI, no Problems panel.
- **No Docker, database, or API-client tooling.**
- **No multi-window / dockable / split-pane IDE layout.** One editor file and
  one terminal per project view; no editor tabs yet.
- **No plugin SDK/runtime.**
- Terminal has no tabs/splits/search/session-persistence yet.

The [ROADMAP](ROADMAP.md) marks all of this honestly (✅ / 🚧 / 📋). Several
prompt "phases" asked to *finish* or *verify* these as if they existed; they
don't. The right move has been to build real, tested slices and keep docs
truthful rather than generate hollow panels.

## Build & verify (the environment gotchas)

This was developed on **Windows** with these constraints — a fresh environment
may differ:

- **Rust**: the working local toolchain is `stable-x86_64-pc-windows-gnu`
  (the msvc one lacks a usable linker here). Bundled SQLite needs a C compiler;
  a WinLibs MinGW `gcc` on `PATH` satisfies it. On CI (Linux/macOS/Windows
  runners) plain `stable` is fine.
- **Node is not installed locally.** The frontend and website are therefore
  **only built in CI**. You cannot run `npm`/`tsc`/`vite` on the dev box as-is.
- **`src-tauri` cannot compile locally** (no webview stack). It builds only in
  CI. Because of this, the `ipc_types_are_serializable` test in `orbit-core`
  guards every IPC type — keep new command args/returns in it.
- **No `gh` CLI.** Git pushes and all GitHub API work (PRs, merges, releases,
  secrets) go through the stored git-credential token + `curl` against the API.

What you *can* verify locally: `cargo test`, `cargo clippy`, `cargo fmt`,
and running the `orbit` CLI. That's the engine + CLI — the tested heart.

```bash
# from repo root (with the gnu toolchain + gcc on PATH):
cargo test            # 52+ tests, must stay green
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all --check
```

Everything frontend/desktop is proven by the `test` and `build` GitHub Actions
workflows. Treat a red CI as the real signal.

## Release process

Tag `vX.Y.Z` → `release.yml` builds signed installers for macOS (Intel + ARM),
Windows and Linux, plus `latest.json` and `SHA256SUMS.txt`, and creates a
**draft** GitHub Release. Someone then publishes the draft.

- `scripts/bump-version.sh X.Y.Z` bumps every version reference. Then update
  `CHANGELOG.md` (move `[Unreleased]` → the new version) and rewrite
  `RELEASE_NOTES.md` (it becomes the release body).
- The website + README carry **versioned** direct download links — only bump
  those *after* the release publishes, or they 404.
- **Updater signing:** the key is real and set as repo secrets
  (`TAURI_SIGNING_PRIVATE_KEY` + `..._PASSWORD`). It is **password-protected** —
  both secrets are required. If the password secret is missing, minisign falls
  back to an interactive prompt that CI (no TTY) reports as the misleading
  "Wrong password for that key". The private key + password are in the dev box's
  scratchpad, not the repo.

## CI/CD workflows (`.github/workflows/`)

- `test.yml` — engine (fmt/clippy/test) + desktop UI (tsc/build) on every PR.
- `build.yml` — full desktop bundle on 4 platforms, on push to main.
- `release.yml` — signed installers on tag.
- (website deploy lives in the `orbit-web` repo.)

## Open items a maintainer should know

- **Dependabot PRs left open on purpose** (~11 across both repos): risky majors
  — `tauri-action 0→1`, `next 14→15`, `rusqlite 0.31→0.40`, `thiserror 1→2`.
  Merge one at a time with CI watching; don't bulk-merge onto a green release.
- The `docs/` set covers only shipped features by design. If you build Docker/DB/
  API/LSP, add their docs *then*, not before.

## How to keep this honest

The single rule that's kept Orbit credible: **ship what's real, test it, and say
plainly what isn't built.** A prompt asking to "finish the IDE" doesn't make an
LSP appear — build the next real slice and update the ROADMAP. Don't fabricate.
