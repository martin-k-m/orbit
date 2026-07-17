import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  CircleCheck,
  Play,
  Loader2,
  Terminal,
  Package,
  FileCode2,
  ListTodo,
  Sparkles,
  Search,
  Plus,
  X,
  FlaskConical,
  Gauge,
  Bot,
} from "lucide-react";
import type {
  Command,
  CommandOutput,
  Dependency,
  HealthReport,
  ProjectDetail,
} from "@/lib/types";
import { LANGUAGE_META } from "@/lib/types";
import {
  openProject as ipcOpen,
  runCommand,
  openTerminal,
  generateProfile,
  readFile,
} from "@/lib/ipc";
import { TerminalPane } from "@/components/TerminalPane";
import { ExplorerPanel } from "@/components/ExplorerPanel";
import { SearchPanel } from "@/components/SearchPanel";
import { SourceControlPanel } from "@/components/SourceControlPanel";
import { ProblemsPanel } from "@/components/ProblemsPanel";
import { TestingPanel } from "@/components/TestingPanel";
import { AiChatPanel } from "@/components/AiChatPanel";
import { useEditorStore } from "@/store/editor";
import { useWorkspaceStore } from "@/store/workspace";
import { nextActiveAfterClose } from "@/lib/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageChip } from "@/components/LanguageChip";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/cn";

export function ProjectView({
  projectId,
  path,
}: {
  projectId: string;
  path: string;
}) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  // Which tool window is docked at the bottom (null = collapsed) and how tall
  // the dock is — layout state lives in the workspace store so it survives
  // project switches and (for the height) app restarts, IntelliJ-style. The
  // editor (Explorer) is the permanent centre.
  const bottomTool = useWorkspaceStore((s) => s.bottomTool);
  const setBottomTool = useWorkspaceStore((s) => s.setBottomTool);
  const toggleTool = useWorkspaceStore((s) => s.toggleBottomTool);
  const dockHeight = useWorkspaceStore((s) => s.dockHeight);
  const pushToast = useAppStore((s) => s.pushToast);
  const pendingFile = useAppStore((s) => s.pendingFile);
  const clearPendingFile = useAppStore((s) => s.clearPendingFile);
  const openInEditor = useEditorStore((s) => s.openTab);

  useEffect(() => {
    let cancelled = false;
    ipcOpen(projectId, path).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, path]);

  // Quick-open (from the command palette) drops a pending file into the store;
  // when it targets this project, open it in the editor and reveal the Explorer.
  useEffect(() => {
    if (!pendingFile || pendingFile.projectId !== projectId) return;
    const { path: filePath, line } = pendingFile;
    clearPendingFile();
    (async () => {
      const contents = await readFile(filePath);
      openInEditor(filePath, contents, line);
    })();
  }, [pendingFile, projectId, clearPendingFile, openInEditor]);

  if (!detail) {
    return (
      <div className="flex h-64 items-center justify-center text-fg-subtle">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const { project, health, dependencies } = detail;

  async function handleTerminal() {
    await openTerminal(path);
    pushToast({ variant: "default", title: "Opened terminal", description: project.name });
  }

  async function handleProfile() {
    await generateProfile(path);
    pushToast({
      variant: "success",
      title: "Profile generated",
      description: `orbit.toml written for ${project.name}`,
    });
  }

  // Open a file in the centre editor (optionally at a line).
  async function openSearchResult(filePath: string, line?: number) {
    const contents = await readFile(filePath);
    openInEditor(filePath, contents, line);
  }

  const git = detail.git;

  const BOTTOM_TOOLS: { id: string; label: string; icon: typeof Terminal; badge?: number }[] = [
    { id: "ai", label: "AI", icon: Bot },
    { id: "problems", label: "Problems", icon: ListTodo, badge: health.warnings.length || undefined },
    { id: "source-control", label: "Git", icon: GitBranch },
    { id: "search", label: "Search", icon: Search },
    { id: "testing", label: "Testing", icon: FlaskConical },
    { id: "terminal", label: "Terminal", icon: Terminal },
    { id: "overview", label: "Overview", icon: FileCode2 },
    { id: "commands", label: "Commands", icon: Play },
    { id: "health", label: "Health", icon: Gauge },
    { id: "dependencies", label: "Dependencies", icon: Package, badge: dependencies.length || undefined },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Main toolbar */}
      <div className="flex items-center gap-2.5 border-b border-border bg-elevated px-3 py-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-panel text-xs font-semibold text-fg">
          {project.name.slice(0, 1)}
        </span>
        <span className="truncate text-sm font-semibold text-fg">{project.name}</span>
        <LanguageChip language={project.primaryLanguage} />
        {git && (
          <span className="hidden items-center gap-1.5 text-xs text-fg-subtle sm:flex">
            <GitBranch className="h-3.5 w-3.5" />
            {git.branch}
            {git.isClean ? (
              <CircleCheck className="h-3 w-3 text-success" />
            ) : (
              <span className="text-warning">{git.changedFiles} changed</span>
            )}
            {git.ahead > 0 && (
              <span className="inline-flex items-center">
                <ArrowUp className="h-3 w-3" />
                {git.ahead}
              </span>
            )}
            {git.behind > 0 && (
              <span className="inline-flex items-center">
                <ArrowDown className="h-3 w-3" />
                {git.behind}
              </span>
            )}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={handleProfile}>
            <Sparkles className="h-3.5 w-3.5" />
            {project.hasProfile ? "Regenerate profile" : "Generate profile"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setBottomTool("terminal")}>
            <Terminal className="h-3.5 w-3.5" /> Terminal
          </Button>
        </div>
      </div>

      {/* Centre: the editor workspace (file tree + tabs + editor + outline) */}
      <div className="flex min-h-0 flex-1 p-2">
        <ExplorerPanel root={path} />
      </div>

      {/* Bottom tool window (docked) — drag its top edge to resize. */}
      {bottomTool && (
        <div
          className="relative flex min-h-0 flex-col border-t border-border bg-bg"
          style={{ height: dockHeight }}
        >
          <DockResizeHandle />
          <div className="flex items-center gap-2 border-b border-border bg-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            {BOTTOM_TOOLS.find((t) => t.id === bottomTool)?.label}
            <button
              onClick={() => setBottomTool(null)}
              aria-label="Close tool window"
              className="no-drag ml-auto rounded p-0.5 hover:bg-white/[0.06] hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 p-2">
            {bottomTool === "ai" && <AiChatPanel projectName={project.name} />}
            {bottomTool === "search" && (
              <SearchPanel root={path} onOpen={openSearchResult} />
            )}
            {bottomTool === "source-control" && <SourceControlPanel root={path} />}
            {bottomTool === "problems" && (
              <ProblemsPanel root={path} health={health} onOpen={openSearchResult} />
            )}
            {bottomTool === "terminal" && (
              <TerminalTab path={path} onOpen={handleTerminal} />
            )}
            {bottomTool === "testing" && (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <TestingPanel path={path} commands={project.commands} />
              </div>
            )}
            {bottomTool === "overview" && (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <OverviewTab detail={detail} />
              </div>
            )}
            {bottomTool === "commands" && (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <CommandsTab commands={project.commands} path={path} />
              </div>
            )}
            {bottomTool === "health" && (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <HealthView health={health} />
              </div>
            )}
            {bottomTool === "dependencies" && (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <DependenciesTab dependencies={dependencies} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom tool-window stripe */}
      <div className="scrollbar-thin flex items-center gap-0.5 overflow-x-auto border-t border-border bg-elevated px-2 py-0.5">
        {BOTTOM_TOOLS.map((t) => {
          const Icon = t.icon;
          const on = bottomTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => toggleTool(t.id)}
              className={cn(
                "no-drag flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[11px] transition-colors",
                on ? "bg-accent/15 text-accent" : "text-fg-subtle hover:text-fg",
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
              {t.badge != null && (
                <span className="rounded bg-white/[0.1] px-1 text-[9px]">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A grab strip along the top edge of the bottom dock. Dragging it up grows the
 * dock, down shrinks it; the height is clamped and persisted by the store.
 */
function DockResizeHandle() {
  const setDockHeight = useWorkspaceStore((s) => s.setDockHeight);
  const drag = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      // Dragging up (a smaller clientY) grows the dock.
      setDockHeight(drag.current.startH + (drag.current.startY - e.clientY));
    };
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setDockHeight]);

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize tool window"
      onMouseDown={(e) => {
        e.preventDefault();
        drag.current = {
          startY: e.clientY,
          startH: useWorkspaceStore.getState().dockHeight,
        };
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
      }}
      className="no-drag absolute inset-x-0 top-0 z-10 h-1.5 -translate-y-1/2 cursor-row-resize transition-colors hover:bg-accent/40"
    />
  );
}

function OverviewTab({ detail }: { detail: ProjectDetail }) {
  const { project, health, dependencies } = detail;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <MetricCard
        icon={FileCode2}
        label="Files"
        value={health.fileCount.toLocaleString()}
        sub={`${health.totalLines.toLocaleString()} lines`}
      />
      <MetricCard
        icon={Package}
        label="Dependencies"
        value={String(dependencies.length)}
        sub={`${dependencies.filter((d) => d.dev).length} dev`}
      />
      <MetricCard
        icon={ListTodo}
        label="TODOs"
        value={String(health.todoCount)}
        sub="markers in code"
      />

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Ecosystems</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {project.ecosystems.length === 0 && (
            <p className="text-sm text-fg-subtle">No manifests detected.</p>
          )}
          {project.ecosystems.map((e) => (
            <div
              key={e.manifest}
              className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
            >
              <LanguageChip language={e.language} />
              {e.framework && <Badge variant="outline">{e.framework}</Badge>}
              <span className="font-mono text-xs text-fg-subtle">
                {e.manifest}
              </span>
              <span className="ml-auto text-xs text-fg-subtle">
                {e.commands.length} command{e.commands.length === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof FileCode2;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <span className="flex items-center gap-2 text-xs font-medium text-fg-subtle">
          <Icon className="h-4 w-4" /> {label}
        </span>
        <span className="text-2xl font-semibold tracking-tight text-fg">
          {value}
        </span>
        <span className="text-[11px] text-fg-subtle">{sub}</span>
      </CardContent>
    </Card>
  );
}

const SOURCE_VARIANT = {
  detected: "success",
  profile: "accent",
  convention: "outline",
} as const;

function CommandsTab({
  commands,
  path,
}: {
  commands: Command[];
  path: string;
}) {
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<{ name: string; out: CommandOutput } | null>(
    null,
  );
  const pushToast = useAppStore((s) => s.pushToast);

  async function run(cmd: Command) {
    setRunning(cmd.name);
    try {
      const out = await runCommand(path, cmd.name);
      setOutput({ name: cmd.name, out });
      pushToast({
        variant: out.code === 0 ? "success" : "error",
        title: out.code === 0 ? `${cmd.name} finished` : `${cmd.name} failed`,
        description: `exit code ${out.code}`,
      });
    } finally {
      setRunning(null);
    }
  }

  if (commands.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/[0.1] p-10 text-center text-sm text-fg-subtle">
        No commands detected for this project.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        {commands.map((cmd) => (
          <div
            key={cmd.name}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-fg">{cmd.name}</span>
                <Badge variant={SOURCE_VARIANT[cmd.source]}>{cmd.source}</Badge>
              </div>
              <p className="mt-0.5 truncate font-mono text-xs text-fg-subtle">
                {cmd.program} {cmd.args.join(" ")}
              </p>
              {cmd.description && (
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {cmd.description}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => run(cmd)}
              disabled={running !== null}
            >
              {running === cmd.name ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run
            </Button>
          </div>
        ))}
      </div>

      <OutputPanel output={output} />
    </div>
  );
}

function OutputPanel({
  output,
}: {
  output: { name: string; out: CommandOutput } | null;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
          <Terminal className="h-3.5 w-3.5" /> Output
        </span>
        {output && (
          <Badge variant={output.out.code === 0 ? "success" : "danger"}>
            exit {output.out.code}
          </Badge>
        )}
      </div>
      <div className="scrollbar-thin max-h-80 min-h-[12rem] overflow-auto p-4">
        {output ? (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-fg-muted">
            {output.out.stdout}
            {output.out.stderr && (
              <span className="text-danger">{output.out.stderr}</span>
            )}
          </pre>
        ) : (
          <p className="text-xs text-fg-subtle">
            Run a command to see its output here.
          </p>
        )}
      </div>
    </Card>
  );
}

export function HealthView({ health }: { health: HealthReport }) {
  const tone =
    health.score >= 85 ? "success" : health.score >= 70 ? "warning" : "danger";
  const barColor =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-danger";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <ScoreRing score={health.score} tone={tone} />
          <div className="flex w-full flex-col gap-2 text-sm">
            <div className="flex justify-between text-fg-muted">
              <span>Files</span>
              <span className="text-fg">{health.fileCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>Lines</span>
              <span className="text-fg">
                {health.totalLines.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>TODOs</span>
              <span className="text-fg">{health.todoCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Warnings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {health.warnings.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-3 text-sm text-success">
              <CircleCheck className="h-4 w-4" /> No warnings — looking healthy.
            </div>
          )}
          {health.warnings.map((w, i) => (
            <motion.div
              key={`${w.kind}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3"
            >
              <span
                className={cn(
                  "mt-1 flex h-6 items-center rounded px-1.5 text-[10px] font-semibold uppercase",
                  barColor,
                  "text-white",
                )}
              >
                -{w.penalty}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-fg">{w.message}</p>
                <p className="text-xs text-fg-subtle">
                  {w.kind}
                  {w.path ? ` · ${w.path}` : ""}
                </p>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreRing({
  score,
  tone,
}: {
  score: number;
  tone: "success" | "warning" | "danger";
}) {
  const color =
    tone === "success"
      ? "hsl(var(--success))"
      : tone === "warning"
        ? "hsl(var(--warning))"
        : "hsl(var(--danger))";
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="10"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-fg">{score}</span>
        <span className="text-[11px] text-fg-subtle">/ 100</span>
      </div>
    </div>
  );
}

function DependenciesTab({ dependencies }: { dependencies: Dependency[] }) {
  const grouped = useMemo(() => {
    const runtime = dependencies.filter((d) => !d.dev);
    const dev = dependencies.filter((d) => d.dev);
    return { runtime, dev };
  }, [dependencies]);

  if (dependencies.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/[0.1] p-10 text-center text-sm text-fg-subtle">
        No dependencies found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DepGroup title="Runtime" deps={grouped.runtime} />
      <DepGroup title="Development" deps={grouped.dev} />
    </div>
  );
}

function DepGroup({ title, deps }: { title: string; deps: Dependency[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          {title}
          <span className="text-xs font-normal text-fg-subtle">
            {deps.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {deps.length === 0 && (
          <p className="text-xs text-fg-subtle">None.</p>
        )}
        {deps.map((d) => (
          <div
            key={d.name}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: LANGUAGE_META[d.language].color }}
            />
            <span className="text-sm text-fg">{d.name}</span>
            <span className="ml-auto font-mono text-xs text-fg-subtle">
              {d.current}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * The project's embedded shell, plus an escape hatch to the system terminal for
 * anyone who'd rather use their own.
 */
function TerminalTab({ path, onOpen }: { path: string; onOpen: () => void }) {
  const counter = useRef(1);
  const [tabs, setTabs] = useState<string[]>(["term-1"]);
  const [active, setActive] = useState("term-1");

  function addTab() {
    const id = `term-${++counter.current}`;
    setTabs((ts) => [...ts, id]);
    setActive(id);
  }

  function closeTab(id: string) {
    if (tabs.length <= 1) return; // always keep one shell
    const next = nextActiveAfterClose(tabs, id, active);
    if (next) setActive(next);
    setTabs((ts) => ts.filter((t) => t !== id));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-panel">
      {/* Tab strip */}
      <div className="flex items-center gap-1 border-b border-border px-1">
        {tabs.map((id, i) => (
          <div
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "no-drag group flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-1.5 text-[13px] transition-colors",
              id === active
                ? "border-accent text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            <Terminal className="h-3.5 w-3.5 shrink-0" />
            <span>Terminal {i + 1}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(id);
                }}
                aria-label={`Close Terminal ${i + 1}`}
                className="no-drag ml-0.5 flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-white/[0.08] group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTab}
          aria-label="New terminal"
          className="no-drag ml-1 flex h-7 w-7 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <Plus className="h-4 w-4" />
        </button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onOpen}>
          <Terminal className="h-3.5 w-3.5" /> System terminal
        </Button>
      </div>

      {/* Panes stay mounted so background shells keep running; hide inactive
          ones. TerminalPane's ResizeObserver refits when it becomes visible. */}
      <div className="relative min-h-0 flex-1">
        {tabs.map((id) => (
          <div
            key={id}
            className={cn("absolute inset-0", id === active ? "block" : "hidden")}
          >
            <TerminalPane path={path} className="h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
