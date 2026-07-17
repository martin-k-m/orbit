"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Github, Menu, X } from "lucide-react";
import { OrbitGlyph } from "./OrbitGlyph";
import { cn } from "./cn";

const GITHUB_URL = "https://github.com/martin-k-m/orbit";
const RELEASES_URL = "https://github.com/martin-k-m/orbit/releases/latest";

const links = [
  { label: "Features", href: "/#features" },
  { label: "Docs", href: "/docs" },
  { label: "Download", href: "/#download" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors duration-300",
        scrolled
          ? "border-b border-white/10 bg-ink-950/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Orbit home"
        >
          <OrbitGlyph />
          <span className="text-[17px] font-semibold tracking-tight text-white">
            Orbit
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            GitHub
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Orbit on GitHub"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            <Github className="h-4 w-4" />
          </a>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2">
            Download
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-200 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-ink-950/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-slate-200 transition-colors hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2"
            >
              Download Orbit
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
