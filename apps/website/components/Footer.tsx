import Link from "next/link";
import { Github } from "lucide-react";
import { OrbitGlyph } from "./OrbitGlyph";

const GITHUB_URL = "https://github.com/martin-k-m/orbit";
const RELEASES_URL = "https://github.com/martin-k-m/orbit/releases/latest";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Product tour", href: "/#demo" },
      { label: "Ecosystem", href: "/#ecosystem" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Introduction", href: "/docs" },
      { label: "Getting started", href: "/docs/getting-started" },
      { label: "CLI reference", href: "/docs/cli" },
      { label: "Architecture", href: "/docs/architecture" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "Releases", href: RELEASES_URL, external: true },
      { label: "Profiles", href: "/docs/profiles" },
      { label: "Plugins", href: "/docs/plugins" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-ink-950">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Orbit home">
              <OrbitGlyph />
              <span className="text-base font-semibold text-white">Orbit</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-500">
              A local-first developer command center. Everything on your machine.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-slate-500 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-slate-500 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Orbit. MIT Licensed. Built with Rust & Tauri.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">Local-first · No telemetry</span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Orbit on GitHub"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
