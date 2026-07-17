# Orbit — Desktop UI

The frontend for **Orbit**, a local-first developer command center built with
Tauri 2 + React 18 + TypeScript.

## Stack

- **Vite 5** + **React 18** + **TypeScript 5** (strict)
- **Tailwind CSS 3** with a custom dark-first theme + `tailwindcss-animate`
- **@tauri-apps/api v2** (+ `plugin-dialog`, `plugin-shell`, `plugin-opener`)
- **framer-motion** (motion), **recharts** (analytics), **cmdk** (command palette)
- **lucide-react** (icons), **zustand** (state), **Radix UI** primitives

## Development

```bash
npm install
npm run dev      # start the Vite dev server on http://localhost:5173
npm run build    # type-check (tsc) + production build → dist/
npm run preview  # preview the production build
npm run lint     # eslint
```

Run inside the Tauri shell (from the crate root) for the full desktop app:

```bash
cargo tauri dev
```

## Demo mode

The IPC layer in [`src/lib/ipc.ts`](src/lib/ipc.ts) detects whether it is
running inside the Tauri runtime via `'__TAURI_INTERNALS__' in window`.

- **Inside Tauri** → calls the real Rust backend via `invoke(...)`.
- **In a plain browser / CI** → returns rich, self-contained **demo data** so the
  app renders and degrades gracefully (useful for local UI work and screenshots).

This means `npm run dev` works with no backend at all — you'll see a seeded
ecosystem of 5 projects (Orbit, Blink, Beacon, Killer, Flux), health reports,
git status, dependencies, and an activity report.

## Structure

```
src/
  lib/        cn, ipc (typed IPC + demo data), format, types
  store/      zustand app store (routing, theme, palette, toasts)
  components/ AppShell, Sidebar, TitleBar, CommandPalette, ProjectCard,
              QuickActions, Toaster, OrbitGlyph, LanguageChip, ui/ primitives
  views/      Dashboard, ProjectView (+ HealthView), Analytics, Ecosystem, Settings
```

## Notes

- The custom titlebar uses `data-tauri-drag-region` and reserves 78px on macOS
  for the traffic-light window controls (12px elsewhere).
- The window is expected to use an overlay title bar style.
- All colors are driven by CSS variables in `src/index.css`; light + dark themes
  are both supported via the `.dark` / `.light` class on `<html>`.
- The command palette opens with `⌘K` / `Ctrl+K`, or via the native
  `menu:command-palette` event.
