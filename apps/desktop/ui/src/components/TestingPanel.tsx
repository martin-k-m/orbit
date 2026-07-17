import { useState } from "react";
import { FlaskConical, Play, Loader2, Check, X } from "lucide-react";
import type { Command, CommandOutput, TestSummary } from "@/lib/types";
import { runCommand, parseTestOutput, isTauri } from "@/lib/ipc";
import { cn } from "@/lib/cn";

/**
 * Runs a project's `test` command and shows a parsed pass/fail summary plus the
 * raw output. Summaries come from `orbit_core::testing` (cargo, Jest/Vitest,
 * pytest); anything unrecognised still shows its output and exit code.
 */
export function TestingPanel({ path, commands }: { path: string; commands: Command[] }) {
  const testCmd = commands.find((c) => c.name === "test");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<CommandOutput | null>(null);
  const [summary, setSummary] = useState<TestSummary | null>(null);

  async function run() {
    if (!testCmd) return;
    setRunning(true);
    setSummary(null);
    try {
      const out = await runCommand(path, testCmd.name);
      setOutput(out);
      const combined = `${out.stdout}\n${out.stderr}`;
      setSummary(await parseTestOutput(combined));
    } finally {
      setRunning(false);
    }
  }

  if (!testCmd) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-8 text-center">
        <FlaskConical className="mx-auto h-8 w-8 text-fg-subtle" />
        <p className="mt-3 text-sm text-fg-muted">No test command detected for this project.</p>
      </div>
    );
  }

  const passed = output && (output.code === 0 || (summary ? summary.failed === 0 : false));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
          <FlaskConical className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">Tests</h2>
          <p className="truncate font-mono text-[11px] text-fg-subtle">
            {testCmd.program} {testCmd.args.join(" ")}
          </p>
        </div>
        <button
          onClick={run}
          disabled={running || !isTauri()}
          className="no-drag ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Running…" : "Run tests"}
        </button>
      </div>

      {summary && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={summary.failed === 0 ? "success" : "danger"}>
            {summary.failed === 0 ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {summary.passed}/{summary.total} passed
          </Badge>
          {summary.failed > 0 && <Badge tone="danger">{summary.failed} failed</Badge>}
          <span className="text-xs text-fg-subtle">via {summary.framework}</span>
        </div>
      )}

      {output && (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-1.5 text-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                passed ? "bg-success" : "bg-danger",
              )}
            />
            <span className="text-fg-subtle">Exit code {output.code}</span>
          </div>
          <pre className="scrollbar-thin max-h-[380px] overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[12px] leading-relaxed text-fg-muted">
            {output.stdout || output.stderr || "(no output)"}
            {output.stdout && output.stderr ? `\n${output.stderr}` : ""}
          </pre>
        </div>
      )}

      {!output && !running && (
        <p className="text-sm text-fg-subtle">
          Run the suite to see results here.
        </p>
      )}
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "success" ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
      )}
    >
      {children}
    </span>
  );
}
