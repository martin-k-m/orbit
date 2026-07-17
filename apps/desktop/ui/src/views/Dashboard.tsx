import { useEffect, useMemo } from "react";
import { useAppStore } from "@/store/app";
import { listProjects } from "@/lib/ipc";
import { ProjectCard } from "@/components/ProjectCard";
import { QuickActions } from "@/components/QuickActions";

/**
 * The Projects launcher / welcome home — recent projects and quick actions.
 * (Coding stats moved to Analytics; live per-project context lives in the
 * status bar.)
 */
export function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);

  useEffect(() => {
    if (projects.length === 0) {
      listProjects().then(setProjects);
    }
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
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Projects</h1>
        <p className="text-sm text-fg-muted">
          {projects.length} project{projects.length === 1 ? "" : "s"} tracked
          {changed > 0 && ` · ${changed} with uncommitted changes`}
        </p>
      </header>

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
          Recent projects
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
    </div>
  );
}
