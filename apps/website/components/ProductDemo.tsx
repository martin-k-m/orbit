"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Boxes,
  Command,
  GitBranch,
  LayoutDashboard,
  Search,
  TrendingUp,
} from "lucide-react";
import { Reveal, Section, SectionHeading } from "./Section";
import { cn } from "./cn";

type TabId = "dashboard" | "project" | "palette" | "analytics";

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "project", label: "Project view", icon: Boxes },
  { id: "palette", label: "Command palette", icon: Command },
  { id: "analytics", label: "Analytics", icon: Activity },
];

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[360px] w-full rounded-xl border border-white/[0.06] bg-black/20 p-4 sm:p-6">
      {children}
    </div>
  );
}

function DashboardPanel() {
  return (
    <Frame>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Workspace overview</span>
        <span className="text-[11px] text-slate-500">Updated just now</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Projects", value: "12" },
          { label: "Healthy", value: "9", tone: "text-emerald-400" },
          { label: "Attention", value: "3", tone: "text-amber-400" },
          { label: "Commits", value: "27" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className={cn("text-2xl font-semibold text-white", s.tone)}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {["orbit-core", "credda-api", "flux-engine"].map((n, i) => (
          <div key={n} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className={cn("h-2 w-2 rounded-full", ["bg-orange-400", "bg-sky-400", "bg-cyan-300"][i])} />
            <span className="text-[13px] text-white">{n}</span>
            <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet"
                style={{ width: `${[98, 84, 91][i]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ProjectPanel() {
  return (
    <Frame>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">orbit-core</span>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400">Rust</span>
      </div>
      <div className="mb-4 flex items-center gap-2 text-[11px] text-slate-500">
        <GitBranch className="h-3 w-3" /> main · clean working tree
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Health", value: "98%", tone: "text-emerald-400" },
          { label: "Dependencies", value: "42" },
          { label: "Open issues", value: "3" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className={cn("text-xl font-semibold text-white", s.tone)}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Tasks</div>
        {["cargo build --release", "cargo test", "cargo clippy"].map((t) => (
          <div key={t} className="flex items-center justify-between py-1.5 font-mono text-[12px] text-slate-300">
            <span>{t}</span>
            <span className="text-emerald-400">passing</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function PalettePanel() {
  return (
    <Frame>
      <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-white/15 bg-ink-850/95 shadow-xl ring-1 ring-brand-violet/20">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-3">
          <Search className="h-4 w-4 text-brand-violet" />
          <span className="text-[13px] text-slate-300">git</span>
          <span className="ml-auto rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">⌘K</span>
        </div>
        <div className="p-1.5">
          {[
            { label: "Sync all repositories", hint: "orbit git sync" },
            { label: "Show dirty repos", hint: "orbit git status" },
            { label: "Pull latest on main", hint: "orbit git pull" },
            { label: "Create feature branch", hint: "orbit git branch" },
          ].map((c, i) => (
            <div
              key={c.label}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px]",
                i === 0 ? "bg-gradient-to-r from-brand-indigo/25 to-brand-violet/10 text-white" : "text-slate-400",
              )}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>{c.label}</span>
              <span className="ml-auto font-mono text-[10px] text-slate-500">{c.hint}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-500">Fuzzy-search every command, script, and project — instantly.</p>
    </Frame>
  );
}

function AnalyticsPanel() {
  const bars = [40, 62, 48, 78, 55, 90, 72, 65, 84, 58, 96, 70];
  return (
    <Frame>
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-brand-violet" />
        <span className="text-sm font-semibold text-white">Commit activity</span>
        <span className="ml-auto text-[11px] text-slate-500">Last 12 weeks</span>
      </div>
      <div className="flex h-40 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-brand-indigo/60 to-brand-violet"
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Rust", value: "48%" },
          { label: "TypeScript", value: "31%" },
          { label: "Python", value: "21%" },
        ].map((l) => (
          <div key={l.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-lg font-semibold text-white">{l.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{l.label}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const panels: Record<TabId, React.ReactNode> = {
  dashboard: <DashboardPanel />,
  project: <ProjectPanel />,
  palette: <PalettePanel />,
  analytics: <AnalyticsPanel />,
};

export function ProductDemo() {
  const [active, setActive] = useState<TabId>("dashboard");
  const reduce = useReducedMotion();

  return (
    <Section id="demo" className="py-20 sm:py-28">
      <SectionHeading
        eyebrow="Product tour"
        title="See Orbit in motion"
        description="Every view is a fast, native surface. Switch between your dashboard, a single project, the command palette, and local analytics."
      />

      <Reveal className="mt-12">
        <div className="mx-auto max-w-4xl">
          <div
            role="tablist"
            aria-label="Product views"
            className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                onClick={() => setActive(t.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                  active === t.id ? "text-white" : "text-slate-400 hover:text-white",
                )}
              >
                {active === t.id ? (
                  <motion.span
                    layoutId="demo-tab"
                    className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-brand-indigo/25 to-brand-violet/15 ring-1 ring-inset ring-brand-violet/30"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                ) : null}
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {panels[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
