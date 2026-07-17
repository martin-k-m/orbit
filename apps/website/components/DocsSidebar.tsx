"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { docsNav } from "@/docs/_nav";
import { cn } from "./cn";

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const normalize = (p: string) => (p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p);
  const current = normalize(pathname);

  return (
    <nav className="flex flex-col gap-7" aria-label="Documentation">
      {docsNav.map((group) => (
        <div key={group.title}>
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {group.title}
          </div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = current === normalize(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-gradient-to-r from-brand-indigo/20 to-brand-violet/10 font-medium text-white ring-1 ring-inset ring-brand-violet/30"
                        : "text-slate-400 hover:bg-white/[0.03] hover:text-white",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-white/[0.06] px-4 py-8 lg:block">
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <div className="sticky top-16 z-30 border-b border-white/[0.06] bg-ink-950/80 px-5 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle documentation menu"
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Documentation menu
        </button>
      </div>

      {open ? (
        <div className="border-b border-white/[0.06] bg-ink-950 px-5 py-6 lg:hidden">
          <NavContent onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </>
  );
}
