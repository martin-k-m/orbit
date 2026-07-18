import { GitBranch, Bot, Check } from "lucide-react";
import { useAppStore } from "@/store/app";
import { useEditorStore, activeTab } from "@/store/editor";
import { useWorkspaceStore } from "@/store/workspace";
import { useSettingsStore } from "@/store/settings";
import { useAiStore } from "@/store/ai";
import type { Encoding, LineEnding } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * A VS Code-style status bar across the bottom of the window. Segments are
 * interactive where it helps: the branch and AI chips open their tool windows.
 * Left: git branch + working-tree state. Right: caret position, indent, the
 * active file's encoding / EOL / language, an AI indicator, and a privacy chip.
 */
export function StatusBar() {
  const view = useAppStore((s) => s.view);
  const projects = useAppStore((s) => s.projects);
  const selectedId = useAppStore((s) => s.selectedProjectId);
  const project = projects.find((p) => p.id === selectedId);
  const cursor = useEditorStore((s) => s.cursor);
  const active = useEditorStore(activeTab);
  const setBottomTool = useWorkspaceStore((s) => s.setBottomTool);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const aiOn = useAiStore((s) => s.enabled);
  const inProject = view.kind === "project";

  return (
    <footer className="relative z-30 flex h-[22px] shrink-0 items-stretch border-t border-border bg-elevated text-[11px] text-fg-subtle">
      {inProject && project?.gitBranch && (
        <Chip onClick={() => setBottomTool("source-control")} title="Source control">
          <GitBranch className="h-3 w-3" />
          {project.gitBranch}
          {project.gitClean === false ? (
            <span className="text-warning">
              {project.changedFiles ? `✱ ${project.changedFiles}` : "✱"}
            </span>
          ) : (
            <Check className="h-3 w-3 text-success" />
          )}
        </Chip>
      )}

      {inProject && active && !active.contents.binary && (
        <Static className="tabular-nums">
          Ln {cursor.line}, Col {cursor.col}
        </Static>
      )}

      <div className="ml-auto flex items-stretch">
        {inProject && active && !active.contents.binary && (
          <>
            <Static>Spaces: {tabSize}</Static>
            <Static>{encodingLabel(active.contents.encoding)}</Static>
            <Static>{lineEndingLabel(active.contents.lineEnding)}</Static>
            <Static className="capitalize">{active.contents.language ?? "text"}</Static>
          </>
        )}
        {inProject && aiOn && (
          <Chip onClick={() => setBottomTool("ai")} title="AI assistant">
            <Bot className="h-3 w-3 text-accent" /> AI
          </Chip>
        )}
        <Static>
          <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success))]" />
          Local
        </Static>
      </div>
    </footer>
  );
}

/** A clickable status segment with a hover state. */
function Chip({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="no-drag inline-flex items-center gap-1.5 px-2 transition-colors hover:bg-white/[0.08] hover:text-fg"
    >
      {children}
    </button>
  );
}

/** A non-interactive status segment. */
function Static({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2", className)}>
      {children}
    </span>
  );
}

function encodingLabel(e: Encoding): string {
  return e === "utf-16-le" ? "UTF-16 LE" : e === "utf-16-be" ? "UTF-16 BE" : "UTF-8";
}
function lineEndingLabel(l: LineEnding): string {
  return l === "crlf" ? "CRLF" : l === "lf" ? "LF" : "—";
}
