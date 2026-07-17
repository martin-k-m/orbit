import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  Container,
  Settings as SettingsIcon,
  Plus,
  Circle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore, type View } from "@/store/app";
import { OrbitGlyph } from "@/components/OrbitGlyph";
import { LanguageChip } from "@/components/LanguageChip";
import { cn } from "@/lib/cn";
import { appVersion, pickFolder, addProject } from "@/lib/ipc";
import type { ProjectSummary } from "@/lib/types";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  view: View;
  match: (v: View) => boolean;
}

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    view: { kind: "dashboard" },
    match: (v) => v.kind === "dashboard" || v.kind === "project",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    view: { kind: "analytics" },
    match: (v) => v.kind === "analytics",
  },
  {
    label: "Ecosystem",
    icon: Boxes,
    view: { kind: "ecosystem" },
    match: (v) => v.kind === "ecosystem",
  },
  {
    label: "Containers",
    icon: Container,
    view: { kind: "docker" },
    match: (v) => v.kind === "docker",
  },
  {
    label: "Settings",
    icon: SettingsIcon,
    view: { kind: "settings" },
    match: (v) => v.kind === "settings",
  },
];

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);
  const openProject = useAppStore((s) => s.openProject);
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const pushToast = useAppStore((s) => s.pushToast);
  const [version, setVersion] = useState("");

  useEffect(() => {
    appVersion().then(setVersion);
  }, []);

  const recent = [...projects]
    .sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))
    .slice(0, 6);

  async function handleAdd() {
    const path = await pickFolder();
    if (!path) return;
    const next: ProjectSummary[] = await addProject(path);
    setProjects(next);
    pushToast({
      variant: "success",
      title: "Project added",
      description: path,
    });
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.05] bg-bg/40">
      {/* Brand */}
      <button
        onClick={() => navigate({ kind: "dashboard" })}
        className="no-drag flex items-center gap-2.5 px-4 py-4 text-left"
      >
        <OrbitGlyph className="h-7 w-7" spin />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-fg">
            Orbit
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-widest text-fg-subtle">
            Command Center
          </span>
        </div>
      </button>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2.5">
        {NAV.map((item) => {
          const active = item.match(view);
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.view)}
              className={cn(
                "no-drag relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-fg"
                  : "text-fg-muted hover:text-fg hover:bg-white/[0.04]",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-white/[0.06] ring-1 ring-white/[0.06]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative h-4 w-4 shrink-0" />
              <span className="relative">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Recent projects */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col px-2.5">
        <div className="flex items-center justify-between px-2.5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">
            Projects
          </span>
          <button
            onClick={handleAdd}
            className="no-drag rounded-md p-1 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
            aria-label="Add project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="scrollbar-thin flex flex-col gap-0.5 overflow-y-auto pr-1">
          {recent.map((p) => {
            const active =
              view.kind === "project" && selectedProjectId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => openProject(p.id, p.path)}
                className={cn(
                  "no-drag group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-white/[0.06] text-fg"
                    : "text-fg-muted hover:bg-white/[0.04] hover:text-fg",
                )}
              >
                <LanguageChip
                  language={p.primaryLanguage}
                  showLabel={false}
                  className="border-0 bg-transparent p-0"
                />
                <span className="flex-1 truncate text-left">{p.name}</span>
                {p.gitClean === false && (
                  <Circle className="h-2 w-2 fill-warning text-warning" />
                )}
              </button>
            );
          })}
          {recent.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-fg-subtle">
              No projects yet.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-white/[0.05] px-4 py-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-fg-subtle">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
            Local · No account
          </span>
          <span className="font-mono text-fg-subtle">
            {version ? `v${version}` : ""}
          </span>
        </div>
      </div>
    </aside>
  );
}
