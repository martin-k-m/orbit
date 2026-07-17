# orbit-web

The marketing website and documentation for **Orbit** — a local-first developer
command center desktop app.

Built with **Next.js 14** (App Router), **React 18**, **TypeScript 5** (strict),
**Tailwind CSS 3**, and **framer-motion**. It is configured for **static export**
so it can be deployed to GitHub Pages or any static host with no backend.

## Getting started

```bash
npm install
npm run dev      # start the dev server at http://localhost:3000
```

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the local dev server.                  |
| `npm run build` | Build and statically export the site.        |
| `npm run start` | Serve the production build (non-export mode). |
| `npm run lint`  | Run ESLint via `next lint`.                  |

## Static export

`next.config.mjs` sets `output: "export"` and `images: { unoptimized: true }`,
so `npm run build` emits a fully static site into the `out/` directory:

```bash
npm install
npm run build
# -> static site in ./out
```

No server is required. Open `out/index.html` behind any static file server.

## Deploying to GitHub Pages

1. Build the static site: `npm run build`. The output lands in `out/`.
2. The `public/.nojekyll` file is copied into `out/` so GitHub Pages does not run
   Jekyll (which would strip `_next` asset folders).
3. Publish the `out/` directory to your Pages branch, or use an action such as
   `actions/upload-pages-artifact` + `actions/deploy-pages`.

### Base path (project pages)

If you deploy under a repository subpath (for example
`https://<user>.github.io/orbit/`), set a base path so assets resolve correctly.
Add the following to `next.config.mjs`:

```js
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: "/orbit",
  assetPrefix: "/orbit/",
  // ...
};
```

Serving from a user/organization root domain (or a custom domain) needs no base
path.

### Example GitHub Actions workflow

```yaml
name: Deploy orbit-web
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
        working-directory: apps/website
      - run: npm run build
        working-directory: apps/website
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/website/out
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

## Project structure

```
orbit-web/
├─ app/
│  ├─ layout.tsx           # Root layout + metadata (OG, theme-color)
│  ├─ globals.css          # Tailwind layers + design tokens
│  ├─ page.tsx             # Landing page
│  └─ docs/                # Documentation area (App Router)
│     ├─ layout.tsx        # Docs shell: sidebar + prose container
│     ├─ page.tsx          # Introduction
│     ├─ getting-started/
│     ├─ installation/
│     ├─ architecture/
│     ├─ cli/
│     ├─ profiles/
│     └─ plugins/
├─ components/             # UI + section components
├─ docs/_nav.ts           # Docs navigation + prev/next helpers
├─ public/                # favicon.svg, .nojekyll, og note
├─ next.config.mjs        # Static export config
├─ tailwind.config.ts
└─ tsconfig.json
```

## Design

Dark-mode-first, near-black backgrounds with indigo/violet accents, glass panels,
subtle gradients, and tasteful motion. All product visuals (the app mockup,
product tour, ecosystem diagram, CLI windows) are recreated in pure HTML/CSS/SVG —
there are no bitmap screenshots to load. Motion respects
`prefers-reduced-motion`, and interactive controls have visible focus rings.

## License

MIT.
