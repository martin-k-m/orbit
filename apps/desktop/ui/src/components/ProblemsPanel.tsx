import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { EnvReport, HealthReport } from "@/lib/types";
import { envReport, lspDiagnostics, pathToUri, isTauri } from "@/lib/ipc";
import { useEditorStore } from "@/store/editor";
import { cn } from "@/lib/cn";

type Severity = "error" | "warning";
interface Problem {
  severity: Severity;
  source: string;
  kind: string;
  message: string;
  path?: string;
  line?: number;
}

/**
 * A unified diagnostics view. It aggregates the diagnostics Orbit actually
 * computes today — project **health** warnings and **environment** issues —
 * and lets you jump to the source. It is deliberately honest: there are no
 * compiler/LSP diagnostics yet, so it surfaces Orbit's own, not `rustc`/`tsc`.
 */
export function ProblemsPanel({
  root,
  health,
  onOpen,
}: {
  root: string;
  health: HealthReport;
  onOpen: (path: string, line?: number) => void;
}) {
  const [env, setEnv] = useState<EnvReport | null>(null);
  const [lspProblems, setLspProblems] = useState<Problem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    envReport(root)
      .then((r) => !cancelled && setEnv(r))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [root]);

  // Poll language-server diagnostics for the files currently open in the editor.
  // The backend starts a server lazily and diagnostics arrive asynchronously, so
  // we re-poll on an interval while the panel is mounted.
  useEffect(() => {
    let cancelled = false;
    const rootUri = pathToUri(root);
    async function poll() {
      const tabs = useEditorStore
        .getState()
        .tabs.filter((t) => t.path.startsWith(root) && t.contents.language && !t.contents.binary);
      const batches = await Promise.all(
        tabs.map(async (t) => {
          const diags = await lspDiagnostics(
            rootUri,
            t.contents.language as string,
            pathToUri(t.path),
            t.draft,
          ).catch(() => []);
          return diags.map<Problem>((d) => ({
            severity: d.severity === 1 ? "error" : "warning",
            source: "LSP",
            kind: severityKind(d.severity),
            message: d.message,
            path: t.path,
            line: d.range.start.line + 1,
          }));
        }),
      );
      if (!cancelled) setLspProblems(batches.flat());
    }
    void poll();
    const iv = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [root]);

  const problems = useMemo<Problem[]>(() => {
    const list: Problem[] = [];
    for (const w of health.warnings) {
      list.push({
        severity: "warning",
        source: "Health",
        kind: w.kind,
        message: w.message,
        path: w.path ?? undefined,
      });
    }
    if (env) {
      for (const iss of env.issues) {
        list.push({
          severity: "error",
          source: "Env",
          kind: iss.kind,
          message: iss.message,
          path: iss.file,
          line: lineForEnvIssue(env, iss.file, iss.key ?? undefined),
        });
      }
    }
    list.push(...lspProblems);
    // Errors first, then warnings; stable within each.
    return list.sort((a, b) => rank(a.severity) - rank(b.severity));
  }, [health, env, lspProblems]);

  const errors = problems.filter((p) => p.severity === "error").length;
  const warnings = problems.length - errors;

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-panel">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-2 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-danger" />
          {errors} {errors === 1 ? "error" : "errors"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          {warnings} {warnings === 1 ? "warning" : "warnings"}
        </span>
        <span className="ml-auto text-fg-subtle/70">health · environment · language server</span>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {!loaded ? (
          <Centered>
            <Loader2 className="h-4 w-4 animate-spin text-fg-subtle" />
          </Centered>
        ) : problems.length === 0 ? (
          <Centered>
            <div className="flex flex-col items-center gap-2 text-fg-subtle">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <span className="text-sm">
                {isTauri() ? "No problems detected." : "Problems preview — open the desktop app."}
              </span>
            </div>
          </Centered>
        ) : (
          <ul className="py-1">
            {problems.map((p, i) => {
              const clickable = !!p.path;
              return (
                <li key={i}>
                  <button
                    disabled={!clickable}
                    onClick={() => p.path && onOpen(p.path, p.line)}
                    className={cn(
                      "no-drag flex w-full items-start gap-2.5 px-3 py-1.5 text-left transition-colors",
                      clickable ? "hover:bg-white/[0.04]" : "cursor-default",
                    )}
                  >
                    {p.severity === "error" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-fg-muted">{p.message}</span>
                      {p.path && (
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-fg-subtle">
                          {relative(root, p.path)}
                          {p.line != null && `:${p.line}`}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-fg-subtle">
                      {p.source} · {p.kind}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function rank(s: Severity): number {
  return s === "error" ? 0 : 1;
}

function severityKind(severity: number): string {
  switch (severity) {
    case 1:
      return "error";
    case 2:
      return "warning";
    case 3:
      return "info";
    default:
      return "hint";
  }
}

/** Find the line of an env issue by locating its key in the parsed file. */
function lineForEnvIssue(env: EnvReport, file: string, key?: string): number | undefined {
  if (!key) return undefined;
  const f = env.files.find((f) => f.path === file);
  return f?.entries.find((e) => e.key === key)?.line;
}

function relative(root: string, path: string): string {
  return path.startsWith(root) ? path.slice(root.length).replace(/^[/\\]/, "") : path;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center">{children}</div>;
}
