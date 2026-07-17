import { useCallback, useEffect, useState } from "react";
import {
  GitBranch,
  GitCommitHorizontal,
  Plus,
  Minus,
  Check,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import type { Commit, GitStatus, GitStatusEntry } from "@/lib/types";
import {
  gitStatus,
  gitLog,
  gitStage,
  gitUnstage,
  gitDiff,
  gitCommit,
  isTauri,
} from "@/lib/ipc";
import { useAppStore } from "@/store/app";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Selection = { file: string; staged: boolean } | null;

/**
 * The git "power center": staged/unstaged groups with one-click stage/unstage,
 * a commit box, an inline diff viewer and recent history — all on the existing
 * `orbit_core::git` engine (which shells out to the `git` binary).
 */
export function SourceControlPanel({ root }: { root: string }) {
  const pushToast = useAppStore((s) => s.pushToast);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);
  const [diff, setDiff] = useState("");

  const refresh = useCallback(async () => {
    const [s, log] = await Promise.all([gitStatus(root), gitLog(root, 15)]);
    setStatus(s);
    setCommits(log);
    setLoaded(true);
    // Drop a selection whose file no longer has changes on that side.
    setSelected((sel) => {
      if (!sel || !s) return sel;
      const list = sel.staged ? s.staged : s.unstaged;
      return list.some((e) => e.path === sel.file) ? sel : null;
    });
  }, [root]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Load the diff whenever the selection or (via refresh) the tree changes.
  useEffect(() => {
    if (!selected) {
      setDiff("");
      return;
    }
    let cancelled = false;
    gitDiff(root, selected.file, selected.staged).then((d) => {
      if (!cancelled) setDiff(d);
    });
    return () => {
      cancelled = true;
    };
  }, [root, selected, status]);

  const mutate = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
        await refresh();
      } catch (e) {
        pushToast({ variant: "error", title: "Git error", description: String(e) });
      } finally {
        setBusy(false);
      }
    },
    [refresh, pushToast],
  );

  async function commit() {
    if (!message.trim() || !status?.staged.length) return;
    setBusy(true);
    try {
      const c = await gitCommit(root, message.trim());
      setMessage("");
      await refresh();
      pushToast({ variant: "success", title: "Committed", description: c.summary });
    } catch (e) {
      pushToast({ variant: "error", title: "Commit failed", description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Frame>
        <Centered>
          <Loader2 className="h-4 w-4 animate-spin text-fg-subtle" />
        </Centered>
      </Frame>
    );
  }

  if (!status) {
    return (
      <Frame>
        <Centered>
          <p className="text-sm text-fg-subtle">
            {isTauri()
              ? "Not a git repository."
              : "Source control preview — open the desktop app for a real repo."}
          </p>
        </Centered>
      </Frame>
    );
  }

  const canCommit = !!message.trim() && status.staged.length > 0 && !busy;

  return (
    <Frame>
      {/* Left: commit box + change lists */}
      <div className="flex w-[46%] min-w-0 flex-col border-r border-white/[0.06]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-xs">
          <GitBranch className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-fg">{status.branch}</span>
          {status.ahead > 0 && (
            <span className="inline-flex items-center gap-0.5 text-fg-subtle">
              <ArrowUp className="h-3 w-3" />
              {status.ahead}
            </span>
          )}
          {status.behind > 0 && (
            <span className="inline-flex items-center gap-0.5 text-fg-subtle">
              <ArrowDown className="h-3 w-3" />
              {status.behind}
            </span>
          )}
          <button
            onClick={() => void refresh()}
            className="no-drag ml-auto rounded p-1 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
          </button>
        </div>

        {/* Commit box */}
        <div className="border-b border-white/[0.06] p-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter commits.
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void commit();
              }
            }}
            rows={2}
            placeholder="Commit message"
            className="no-drag w-full resize-none rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-2 text-[13px] text-fg outline-none placeholder:text-fg-subtle focus:border-accent/40"
          />
          <button
            onClick={commit}
            disabled={!canCommit}
            className={cn(
              "no-drag mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              canCommit
                ? "bg-accent/15 text-accent hover:bg-accent/25"
                : "cursor-not-allowed bg-white/[0.03] text-fg-subtle",
            )}
          >
            <Check className="h-3.5 w-3.5" />
            Commit {status.staged.length > 0 && `(${status.staged.length})`}
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <Group
            title="Staged Changes"
            entries={status.staged}
            staged
            selected={selected}
            onSelect={setSelected}
            onAction={(file) => void mutate(() => gitUnstage(root, file))}
            onActionAll={
              status.staged.length
                ? () => void mutate(() => gitUnstage(root))
                : undefined
            }
            actionIcon={<Minus className="h-3.5 w-3.5" />}
            actionAllLabel="Unstage all"
          />
          <Group
            title="Changes"
            entries={status.unstaged}
            staged={false}
            selected={selected}
            onSelect={setSelected}
            onAction={(file) => void mutate(() => gitStage(root, file))}
            onActionAll={
              status.unstaged.length
                ? () => void mutate(() => gitStage(root))
                : undefined
            }
            actionIcon={<Plus className="h-3.5 w-3.5" />}
            actionAllLabel="Stage all"
          />

          {status.staged.length === 0 && status.unstaged.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-fg-subtle">
              Nothing to commit — working tree clean.
            </p>
          )}

          {/* Recent history */}
          {commits.length > 0 && (
            <div className="mt-2 border-t border-white/[0.06] pt-2">
              <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                History
              </div>
              {commits.map((c) => (
                <div
                  key={c.hash}
                  className="flex items-center gap-2 px-3 py-1 text-[12px]"
                  title={`${c.author} · ${c.hash}`}
                >
                  <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                  <span className="truncate text-fg-muted">{c.summary}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-fg-subtle">
                    {relativeTime(c.timestamp)}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-fg-subtle">
                    {c.shortHash}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: diff viewer */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-xs">
              <span className="truncate font-mono text-fg-muted">{selected.file}</span>
              <span className="ml-auto text-fg-subtle">
                {selected.staged ? "Staged" : "Working tree"}
              </span>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
              <DiffView diff={diff} />
            </div>
          </>
        ) : (
          <Centered>
            <p className="text-sm text-fg-subtle">Select a file to view its diff.</p>
          </Centered>
        )}
      </div>
    </Frame>
  );
}

function Group({
  title,
  entries,
  staged,
  selected,
  onSelect,
  onAction,
  onActionAll,
  actionIcon,
  actionAllLabel,
}: {
  title: string;
  entries: GitStatusEntry[];
  staged: boolean;
  selected: Selection;
  onSelect: (s: Selection) => void;
  onAction: (file: string) => void;
  onActionAll?: () => void;
  actionIcon: React.ReactNode;
  actionAllLabel: string;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        <span>
          {title} ({entries.length})
        </span>
        {onActionAll && (
          <button
            onClick={onActionAll}
            className="no-drag ml-auto rounded px-1.5 py-0.5 text-[10px] normal-case text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            {actionAllLabel}
          </button>
        )}
      </div>
      {entries.map((e) => {
        const active = selected?.file === e.path && selected.staged === staged;
        return (
          <div
            key={`${staged}:${e.path}`}
            onClick={() => onSelect({ file: e.path, staged })}
            className={cn(
              "no-drag group flex cursor-pointer items-center gap-2 px-3 py-1 text-[13px] transition-colors",
              active ? "bg-accent/10 text-fg" : "text-fg-muted hover:bg-white/[0.04]",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                codeColor(e.code),
              )}
              title={e.label}
            >
              {e.code}
            </span>
            <span className="truncate">{basename(e.path)}</span>
            <span className="truncate text-[11px] text-fg-subtle">{dirname(e.path)}</span>
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                onAction(e.path);
              }}
              className="no-drag ml-auto shrink-0 rounded p-0.5 text-fg-subtle opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-fg group-hover:opacity-100"
              title={staged ? "Unstage" : "Stage"}
            >
              {actionIcon}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DiffView({ diff }: { diff: string }) {
  if (!diff.trim()) {
    return (
      <p className="p-4 text-xs text-fg-subtle">
        No textual diff (the file may be untracked, binary, or unchanged).
      </p>
    );
  }
  const lines = diff.split("\n");
  return (
    <pre className="min-w-max px-3 py-2 font-mono text-[12px] leading-[1.5]">
      {lines.map((line, i) => (
        <div key={i} className={cn("whitespace-pre", diffLineClass(line))}>
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

function diffLineClass(line: string): string {
  if (line.startsWith("+") && !line.startsWith("+++"))
    return "bg-success/10 text-success";
  if (line.startsWith("-") && !line.startsWith("---"))
    return "bg-danger/10 text-danger";
  if (line.startsWith("@@")) return "text-accent";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "text-fg-subtle";
  return "text-fg-muted";
}

function codeColor(code: string): string {
  switch (code) {
    case "M":
      return "bg-warning/20 text-warning";
    case "A":
      return "bg-success/20 text-success";
    case "D":
      return "bg-danger/20 text-danger";
    case "?":
      return "bg-white/[0.08] text-fg-subtle";
    case "U":
      return "bg-danger/25 text-danger";
    default:
      return "bg-accent/20 text-accent";
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[520px] overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center">{children}</div>;
}

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}
function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "";
}
