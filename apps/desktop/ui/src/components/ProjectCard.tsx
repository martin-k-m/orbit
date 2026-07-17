import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import {
  GitBranch,
  Pin,
  PinOff,
  Terminal,
  FileCheck2,
  Package,
  Circle,
} from "lucide-react";
import type { ProjectSummary } from "@/lib/types";
import { ECOSYSTEM_META } from "@/lib/types";
import { LanguageChip } from "@/components/LanguageChip";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { useAppStore } from "@/store/app";
import { openTerminal, setPinned, listProjects } from "@/lib/ipc";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ProjectCard({
  project,
  index,
}: {
  project: ProjectSummary;
  index: number;
}) {
  const openProject = useAppStore((s) => s.openProject);
  const setProjects = useAppStore((s) => s.setProjects);
  const pushToast = useAppStore((s) => s.pushToast);

  const eco = project.ecosystemLink
    ? ECOSYSTEM_META[project.ecosystemLink]
    : null;

  async function togglePin(e: MouseEvent) {
    e.stopPropagation();
    await setPinned(project.id, !project.pinned);
    setProjects(await listProjects());
  }

  async function handleTerminal(e: MouseEvent) {
    e.stopPropagation();
    await openTerminal(project.path);
    pushToast({ variant: "default", title: `Opened terminal`, description: project.name });
  }

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      onClick={() => openProject(project.id, project.path)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur transition-shadow hover:shadow-lift"
    >
      {/* Accent glow on hover */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: eco
            ? `${eco.accent}33`
            : "hsl(var(--accent) / 0.22)",
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-fg">
            {project.name.slice(0, 1)}
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight text-fg">
              {project.name}
            </h3>
            <p className="mt-0.5 text-xs text-fg-subtle">
              {relativeTime(project.lastOpened)}
            </p>
          </div>
        </div>

        <Hint label={project.pinned ? "Unpin" : "Pin"}>
          <span
            role="button"
            tabIndex={-1}
            onClick={togglePin}
            className={cn(
              "no-drag rounded-md p-1.5 transition-colors",
              project.pinned
                ? "text-accent"
                : "text-fg-subtle opacity-0 hover:bg-white/[0.06] hover:text-fg group-hover:opacity-100",
            )}
          >
            {project.pinned ? (
              <Pin className="h-3.5 w-3.5 fill-current" />
            ) : (
              <PinOff className="h-3.5 w-3.5" />
            )}
          </span>
        </Hint>
      </div>

      {project.description && (
        <p className="relative mt-3 line-clamp-2 text-xs leading-relaxed text-fg-muted">
          {project.description}
        </p>
      )}

      <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
        <LanguageChip language={project.primaryLanguage} />
        {eco && (
          <Badge variant="accent" style={{ color: eco.accent }}>
            {eco.label}
          </Badge>
        )}
        {project.hasProfile && (
          <Hint label="Has an Orbit profile">
            <span>
              <Badge variant="outline">
                <FileCheck2 className="h-3 w-3" /> profile
              </Badge>
            </span>
          </Hint>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3 text-xs text-fg-subtle">
        <div className="flex items-center gap-3">
          {project.gitBranch && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" />
              <span className="max-w-[9rem] truncate">{project.gitBranch}</span>
              {project.gitClean === false && (
                <Circle className="h-1.5 w-1.5 fill-warning text-warning" />
              )}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {project.dependencyCount}
          </span>
        </div>

        <Hint label="Open terminal">
          <span
            role="button"
            tabIndex={-1}
            onClick={handleTerminal}
            className="no-drag rounded-md p-1 text-fg-subtle opacity-0 transition-colors hover:bg-white/[0.06] hover:text-fg group-hover:opacity-100"
          >
            <Terminal className="h-3.5 w-3.5" />
          </span>
        </Hint>
      </div>
    </motion.button>
  );
}
