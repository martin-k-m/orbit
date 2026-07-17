import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, FolderGit2, GitCommitHorizontal, Timer } from "lucide-react";
import { useAppStore } from "@/store/app";
import { listProjects, activityReport } from "@/lib/ipc";
import type { ActivityReport } from "@/lib/types";
import { ProjectCard } from "@/components/ProjectCard";
import { QuickActions } from "@/components/QuickActions";
import { LANGUAGE_META } from "@/lib/types";
import { formatDuration, formatHours } from "@/lib/format";

export function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const [report, setReport] = useState<ActivityReport | null>(null);

  useEffect(() => {
    if (projects.length === 0) {
      listProjects().then(setProjects);
    }
    activityReport(7).then(setReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () =>
      [...projects].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.lastOpened ?? 0) - (a.lastOpened ?? 0);
      }),
    [projects],
  );

  const changed = projects.filter((p) => p.gitClean === false).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Good to see you
        </h1>
        <p className="text-sm text-fg-muted">
          {projects.length} project{projects.length === 1 ? "" : "s"} tracked
          {changed > 0 && ` · ${changed} with uncommitted changes`}
        </p>
      </header>

      {/* This week strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon={Clock}
          label="This week"
          value={report ? formatHours(report.totalSeconds) : "—"}
          hint="Active coding time"
        />
        <StatTile
          icon={FolderGit2}
          label="Projects touched"
          value={report ? String(report.projectsTouched) : "—"}
          hint="In the last 7 days"
        />
        <StatTile
          icon={GitCommitHorizontal}
          label="Sessions"
          value={report ? String(report.sessionCount) : "—"}
          hint="Focus sessions"
        />
        <StatTile
          icon={Timer}
          label="Median build"
          value={
            report?.medianBuildMs != null
              ? formatDuration(report.medianBuildMs)
              : "—"
          }
          hint="Across all projects"
        />
      </div>

      {/* Quick actions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          Quick actions
        </h2>
        <QuickActions />
      </section>

      {/* Projects grid */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          Projects
        </h2>
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.1] p-12 text-center text-sm text-fg-subtle">
            No projects yet. Add or scan a folder to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Language mini-legend */}
      {report && report.languages.length > 0 && (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3">
          <span className="text-xs font-medium text-fg-subtle">
            Time by language
          </span>
          {report.languages.map((l) => {
            const meta = LANGUAGE_META[l.language];
            return (
              <span
                key={l.language}
                className="flex items-center gap-1.5 text-xs text-fg-muted"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label}
                <span className="text-fg-subtle">
                  {formatHours(l.seconds)}
                </span>
              </span>
            );
          })}
        </section>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur"
    >
      <div className="flex items-center gap-2 text-fg-subtle">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-semibold tracking-tight text-fg">
        {value}
      </span>
      <span className="text-[11px] text-fg-subtle">{hint}</span>
    </motion.div>
  );
}
