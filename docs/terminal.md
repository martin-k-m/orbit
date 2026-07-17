# Terminal

Each project has a real shell built in. Open a project and go to the
**Terminal** tab — it opens in the project directory, in the shell you actually
use.

## It's a real terminal

Orbit runs your shell on a **pseudo-terminal** (ConPTY on Windows, `openpty` on
macOS/Linux), not as a piped subprocess. That distinction is the whole point:
programs see a TTY, so the things that usually break in embedded consoles work
here.

- Colours and styling (`ls --color`, `cargo`, `npm`, `git`)
- Interactive prompts, spinners and progress bars
- Full-screen programs — `top`, `vim`, `htop`, `lazygit`
- `Ctrl-C`, `Ctrl-D`, arrow keys, history, tab completion
- Reflow when you resize the pane

Scrollback is 10,000 lines, because build output is long.

## Which shell it opens

Orbit picks the shell you actually use, in this order:

1. **Your explicit choice** — `$SHELL` on macOS/Linux, `COMSPEC` on Windows.
2. **The best one installed**, per platform:
   - Windows: PowerShell 7 (`pwsh`) → Windows PowerShell → Command Prompt
   - macOS: `zsh` → `fish` → `bash` → `sh`
   - Linux: `fish` → `zsh` → `bash` → `sh`
3. **A guaranteed fallback** — `sh` (Unix) or `cmd.exe` (Windows).

Shells that aren't installed are never offered. `bash` and `zsh` start as
**login shells** (`-l`) so your profile loads and your `PATH`, aliases and prompt
are the ones you expect. PowerShell starts with `-NoLogo` because the banner is
noise in an embedded pane.

`TERM` is set to `xterm-256color`, so tools emit colour instead of falling back
to plain text.

## Lifecycle

A terminal session belongs to the pane that opened it. Closing the project view
kills the shell — Orbit doesn't leave orphaned processes running in the
background. Each project gets its own session.

> **Sessions don't survive an app restart yet.** Persistent sessions, multiple
> tabs, split panes and output search are on the [roadmap](../ROADMAP.md).

## Prefer your own terminal?

The **Open system terminal** button launches your normal terminal emulator at
the project root — the embedded one is a convenience, not a cage.

## Safety

The embedded terminal is a real shell: whatever you type, runs. It is *your*
shell, with your privileges.

The [dangerous-command guard](./configuration.md) applies to commands Orbit runs
**for** you — tasks, detected commands, `orbit run`. It does not police what you
type into your own terminal, the same way your OS terminal doesn't.

## Troubleshooting

**The pane is blank / no prompt.** The shell may have failed to start. The
status badge shows `error` with the reason — usually a shell in `$SHELL` that no
longer exists. Orbit falls back to `sh`/`cmd.exe` if detection finds nothing.

**Colours look wrong.** Check your prompt isn't hard-coding a `TERM` your theme
doesn't expect; Orbit sets `xterm-256color`.

**It says "terminals need the desktop app".** You're running the UI in a browser
(dev mode), where there's no PTY. Use the desktop build.

## Related

- [Workspaces](./workspace.md) · [Configuration](./configuration.md)
- [ROADMAP](../ROADMAP.md) — tabs, splits, persistence, search
