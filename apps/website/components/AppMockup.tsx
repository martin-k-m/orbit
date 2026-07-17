import {
  Activity,
  Boxes,
  GitBranch,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { OrbitGlyph } from "./OrbitGlyph";
import { cn } from "./cn";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Boxes, label: "Projects" },
  { icon: Terminal, label: "Commands" },
  { icon: Activity, label: "Analytics" },
  { icon: ShieldCheck, label: "Security" },
  { icon: Settings, label: "Settings" },
];

const projects = [
  {
    name: "orbit-core",
    lang: "Rust",
    dot: "bg-orange-400",
    branch: "main",
    health: 98,
    status: "Clean",
    statusTone: "text-emerald-400",
  },
  {
    name: "credda-api",
    lang: "TypeScript",
    dot: "bg-sky-400",
    branch: "feat/auth",
    health: 84,
    status: "3 changes",
    statusTone: "text-amber-400",
  },
  {
    name: "flux-engine",
    lang: "Go",
    dot: "bg-cyan-300",
    branch: "main",
    health: 91,
    status: "Clean",
    statusTone: "text-emerald-400",
  },
  {
    name: "beacon-ml",
    lang: "Python",
    dot: "bg-yellow-300",
    branch: "dev",
    health: 76,
    status: "2 deps",
    statusTone: "text-amber-400",
  },
];

function HealthRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
        {value}
      </span>
    </div>
  );
}

export function AppMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-900/80 shadow-2xl shadow-black/60 backdrop-blur-xl",
        className,
      )}
      role="img"
      aria-label="Orbit desktop app dashboard showing a project sidebar, project health cards, and a command palette."
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/20 px-3 py-1 text-[11px] text-slate-500">
          <Search className="h-3 w-3" />
          <span>Orbit — ~/code</span>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex min-h-[420px]">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-white/[0.06] bg-black/20 p-3 sm:flex">
          <div className="flex items-center gap-2 px-2 py-2">
            <OrbitGlyph className="h-5 w-5" />
            <span className="text-sm font-semibold text-white">Orbit</span>
          </div>
          <nav className="mt-3 flex flex-col gap-0.5">
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]",
                  item.active
                    ? "bg-gradient-to-r from-brand-indigo/20 to-brand-violet/10 text-white ring-1 ring-inset ring-brand-violet/30"
                    : "text-slate-400",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Local-first · offline
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="relative flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Workspace</h3>
              <p className="text-[11px] text-slate-500">12 projects · 4 ecosystems detected</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400">
              <Zap className="h-3.5 w-3.5 text-brand-violet" />
              orbit scan
            </div>
          </div>

          {/* Stat row */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Healthy", value: "9", tone: "text-emerald-400" },
              { label: "Needs attention", value: "3", tone: "text-amber-400" },
              { label: "Commits today", value: "27", tone: "text-white" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className={cn("text-xl font-semibold", s.tone)}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Project cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p.name}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/15"
              >
                <HealthRing value={p.health} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-white">
                      {p.name}
                    </span>
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", p.dot)} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{p.lang}</span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {p.branch}
                    </span>
                  </div>
                </div>
                <span className={cn("shrink-0 text-[11px] font-medium", p.statusTone)}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>

          {/* Command palette overlay */}
          <div className="pointer-events-none absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-6">
            <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-white/15 bg-ink-850/95 shadow-2xl shadow-black/70 backdrop-blur-2xl ring-1 ring-brand-violet/20">
              <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-3">
                <Search className="h-4 w-4 text-brand-violet" />
                <span className="text-[13px] text-slate-300">run health check</span>
                <span className="ml-auto rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                  ⌘K
                </span>
              </div>
              <div className="p-1.5">
                {[
                  { icon: Activity, label: "Run health check", hint: "orbit health" },
                  { icon: GitBranch, label: "Sync all repos", hint: "orbit git sync" },
                  { icon: Terminal, label: "Open dev shell", hint: "orbit run dev" },
                ].map((c, i) => (
                  <div
                    key={c.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px]",
                      i === 0
                        ? "bg-gradient-to-r from-brand-indigo/25 to-brand-violet/10 text-white"
                        : "text-slate-400",
                    )}
                  >
                    <c.icon className="h-3.5 w-3.5" />
                    <span>{c.label}</span>
                    <span className="ml-auto font-mono text-[10px] text-slate-500">
                      {c.hint}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
