import { GitBranch, Circle } from "lucide-react";
import { useAppStore } from "@/store/app";
import { useEditorStore, activeTab } from "@/store/editor";
import type { Encoding, LineEnding } from "@/lib/types";

/**
 * A slim IDE status bar across the bottom of the window. Left: the current
 * project's git branch and the active editor's caret position. Right: the active
 * file's language / encoding / line ending, and a local-first indicator.
 */
export function StatusBar() {
  const view = useAppStore((s) => s.view);
  const projects = useAppStore((s) => s.projects);
  const selectedId = useAppStore((s) => s.selectedProjectId);
  const project = projects.find((p) => p.id === selectedId);
  const cursor = useEditorStore((s) => s.cursor);
  const active = useEditorStore(activeTab);
  const inProject = view.kind === "project";

  return (
    <footer className="relative z-30 flex h-6 shrink-0 items-center gap-3 border-t border-border bg-elevated px-3 text-[11px] text-fg-subtle">
      {inProject && project?.gitBranch && (
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />
          {project.gitBranch}
          {project.gitClean === false && (
            <Circle className="h-1.5 w-1.5 fill-warning text-warning" />
          )}
        </span>
      )}

      {inProject && active && !active.contents.binary && (
        <span className="tabular-nums">
          Ln {cursor.line}, Col {cursor.col}
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        {inProject && active && !active.contents.binary && (
          <>
            <span>{active.contents.language ?? "text"}</span>
            <span>{encodingLabel(active.contents.encoding)}</span>
            <span>{lineEndingLabel(active.contents.lineEnding)}</span>
          </>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success))]" />
          Local · No account
        </span>
      </div>
    </footer>
  );
}

function encodingLabel(e: Encoding): string {
  return e === "utf-16-le" ? "UTF-16 LE" : e === "utf-16-be" ? "UTF-16 BE" : "UTF-8";
}
function lineEndingLabel(l: LineEnding): string {
  return l === "crlf" ? "CRLF" : l === "lf" ? "LF" : "—";
}
