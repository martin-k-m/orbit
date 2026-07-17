# Orbit v1.2.0 — Release Notes

**The IDE release.** Orbit grows from a developer command center into a genuine,
local-first IDE — multi-file editing, universal search, a full git power center,
Docker/database/API tooling, a testing panel, and live language-server
diagnostics — wrapped in a new red identity with a launch splashscreen.

Still everything you'd expect: local-first, no account, no telemetry, fast, and
cross-platform.

## Highlights

### ✍️ A real code editor

- **Multi-file tabs** — every file you open gets its own tab with its own
  unsaved draft; reopening focuses the existing tab, closing picks a neighbour.
- **Find, replace & go-to-line** in-editor (`Ctrl/Cmd+F` · `Ctrl/Cmd+H` ·
  `Ctrl+Alt+G`), a live **Ln, Col** readout, and editor **preferences** (font
  size, tab size, word wrap) that apply live and persist.
- **Document outline** — jump around a file by symbol.
- **File operations** in the Explorer — create, rename and delete, with guards.

### 🔎 Search everywhere

- **Workspace search** — fast find-in-files, click a result to open at the line.
- **Quick-open** — `⌘/Ctrl+K` and type to fuzzy-find any file in the project.

### 🌱 Git, as a first-class panel

A complete Source Control tab: staged/unstaged groups with one-click
stage/unstage, an inline coloured diff, commit, **history with per-commit
patches**, **branches** (switch/create), **fetch / pull / push**, **stash**, and
**tags** — all on the `git` binary you already have.

### 🐳 Containers · 🗄 Database · 🌐 APIs

- **Containers** — list Docker containers and images, start/stop/restart.
- **Database** — open a SQLite file and browse tables, view rows, run `SELECT`s.
- **APIs** — a REST client: method, URL, headers, body, and a JSON-aware
  response viewer.

### 🧪 Testing & Problems

- **Testing** — run a project's test command with a parsed pass/fail summary
  (cargo, Jest/Vitest, pytest).
- **Problems** — a unified, navigable diagnostics view that now includes **live
  language-server diagnostics** for your open files (rust-analyzer,
  typescript-language-server, pylsp, gopls) when a server is installed.

### 🎨 New identity + launch experience

- A **red** visual identity matched to the website, a redesigned glowing logo,
  and a **black-and-red launch splashscreen**.
- A fourth theme: **High Contrast** for low-vision use.

### ⬆️ Updates

Orbit checks for signed updates on launch, and Settings now has an **on-demand
"Check for updates"** that downloads, installs and relaunches.

## Under the hood

Multiple new, unit-tested engine modules — `search`, `docker`, `db`, `http`,
`testing`, `outline`, and an `lsp` client (framing + JSON-RPC + a `Session`
state machine + a driver that spawns real servers). 100+ engine tests stay
green, and the desktop bundle builds on macOS (Intel + Apple Silicon), Windows
and Linux.

## Still to come

Split editors, the LSP go-to-definition/hover gestures, a debugger, and a plugin
SDK — tracked honestly in the [roadmap](https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md).
