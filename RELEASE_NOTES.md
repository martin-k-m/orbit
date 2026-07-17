# Orbit v1.1.0 — Release Notes

The terminal release. Orbit gains a real embedded shell, signed automatic
updates, and a theme that follows your OS — plus a pile of correctness fixes.

Still everything you'd expect: local-first, no account, no telemetry.

## Highlights

### 🖥 Integrated terminal

Every project now has a **real shell built in**, running on a pseudo-terminal
(ConPTY on Windows, `openpty` on macOS/Linux) — not a piped subprocess. Because
programs see a TTY, the things that break in most embedded consoles just work:

- Colours, prompts, spinners and progress bars
- Full-screen programs — `top`, `vim`, `lazygit`
- `Ctrl-C`, history, tab completion, reflow on resize

It opens in the project directory, in the shell you actually use — Orbit detects
`pwsh`/PowerShell/cmd on Windows and zsh/fish/bash on macOS/Linux, respecting
`$SHELL`/`COMSPEC`. `bash`/`zsh` start as login shells so your profile loads.

> Tabs, split panes, output search and sessions that survive a restart are on
> the [roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).

### 🔄 Signed automatic updates

Orbit checks GitHub Releases on launch and offers to install a newer version in
place. Updates are **signed** and verified against a public key compiled into
the app, so a tampered or spoofed release can't install itself. Nothing
downloads or installs without you clicking. See
[docs/updates.md](https://github.com/martin-k-m/orbit/blob/main/docs/updates.md).

### 🎨 System theme

Appearance now offers **Dark / Light / System**. "System" follows your OS and
updates live when it flips. Your choice is also finally remembered across
restarts — previously it silently reset to dark every launch.

### 🗂 Workspaces & environments, wired up

The workspace model (per-project tasks, notes, bookmarks) and the `.env` manager
(discovery, secret masking, duplicate/missing-variable detection) are now
reachable from the app, not just the engine.

## Fixes

- Desktop bundles wouldn't compile because an IPC type wasn't `Serialize`; a
  guard test now catches that class of bug in `cargo test`.
- Fixed the frontend path in the Tauri before-commands that failed every build.
- Fixed the updater signing key (it was password-protected; CI had no TTY for
  the prompt).
- Light mode's status colours were tuned for a dark surface and washed out; they
  are re-tuned.

## Downloads

| Platform | File |
| --- | --- |
| macOS (Apple Silicon) | `Orbit_1.1.0_aarch64.dmg` |
| macOS (Intel) | `Orbit_1.1.0_x64.dmg` |
| Windows | `Orbit_1.1.0_x64_en-US.msi` · `Orbit_1.1.0_x64-setup.exe` |
| Linux | `Orbit_1.1.0_amd64.AppImage` · `Orbit_1.1.0_amd64.deb` |

Verify against `SHA256SUMS.txt`. Full history:
[CHANGELOG.md](https://github.com/martin-k-m/orbit/blob/main/CHANGELOG.md).

## Upgrading

If you're on v1.0.0, install v1.1.0 over it — your local data (projects,
workspaces, settings) is preserved; the database migrates automatically. From
v1.1.0 onward, in-app updates take over.

## Breaking changes

None.
