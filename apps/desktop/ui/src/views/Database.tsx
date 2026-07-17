import { useCallback, useState } from "react";
import {
  Database as DatabaseIcon,
  Table2,
  FolderOpen,
  Play,
  Loader2,
} from "lucide-react";
import type { DbQueryResult, DbTable } from "@/lib/types";
import {
  pickDatabaseFile,
  dbTables,
  dbTableRows,
  dbQuery,
  isTauri,
} from "@/lib/ipc";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/cn";

/** A read-only SQLite explorer: pick a file, browse tables, run SELECTs. */
export function Database() {
  const pushToast = useAppStore((s) => s.pushToast);
  const [path, setPath] = useState<string | null>(null);
  const [tables, setTables] = useState<DbTable[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<DbQueryResult | null>(null);
  const [busy, setBusy] = useState(false);

  const openTable = useCallback(
    async (p: string, table: string) => {
      setActive(table);
      setSql(`SELECT * FROM "${table}" LIMIT 200`);
      setBusy(true);
      try {
        setResult(await dbTableRows(p, table));
      } catch (e) {
        pushToast({ variant: "error", title: "Query failed", description: String(e) });
      } finally {
        setBusy(false);
      }
    },
    [pushToast],
  );

  const loadTables = useCallback(
    async (p: string) => {
      try {
        const ts = await dbTables(p);
        setTables(ts);
        if (ts.length > 0) void openTable(p, ts[0].name);
      } catch (e) {
        pushToast({ variant: "error", title: "Couldn't open database", description: String(e) });
      }
    },
    [pushToast, openTable],
  );

  async function choose() {
    const p = await pickDatabaseFile();
    if (!p) return;
    setPath(p);
    setResult(null);
    setActive(null);
    void loadTables(p);
  }

  async function runSql() {
    if (!path || !sql.trim()) return;
    setBusy(true);
    setActive(null);
    try {
      setResult(await dbQuery(path, sql));
    } catch (e) {
      pushToast({ variant: "error", title: "Query failed", description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
          <DatabaseIcon className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Database</h1>
          <p className="truncate text-sm text-fg-subtle">
            {path ?? "Browse a SQLite database (read-only)."}
          </p>
        </div>
        <button
          onClick={choose}
          className="no-drag ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <FolderOpen className="h-3.5 w-3.5" /> Open .sqlite…
        </button>
      </header>

      {!path ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-8 text-center">
          <DatabaseIcon className="mx-auto h-8 w-8 text-fg-subtle" />
          <p className="mt-3 text-sm text-fg-muted">
            {isTauri()
              ? "Open a SQLite database file to browse its tables and run queries."
              : "Database preview — open the desktop app to read a real database."}
          </p>
        </div>
      ) : (
        <div className="flex h-[560px] overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
          {/* Tables list */}
          <aside className="scrollbar-thin w-56 shrink-0 overflow-y-auto border-r border-white/[0.06] py-2">
            <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              Tables ({tables.length})
            </div>
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => path && void openTable(path, t.name)}
                className={cn(
                  "no-drag flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.04]",
                  active === t.name ? "bg-accent/10 text-fg" : "text-fg-muted",
                )}
              >
                <Table2 className="h-3.5 w-3.5 shrink-0 text-accent/80" />
                <span className="flex-1 truncate">{t.name}</span>
                <span className="shrink-0 text-[10px] text-fg-subtle">{t.rowCount}</span>
              </button>
            ))}
          </aside>

          {/* Query + results */}
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start gap-2 border-b border-white/[0.06] p-2">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void runSql();
                  }
                }}
                rows={2}
                spellCheck={false}
                placeholder="SELECT * FROM …"
                className="no-drag min-w-0 flex-1 resize-none rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-2 font-mono text-[12px] text-fg outline-none placeholder:text-fg-subtle focus:border-accent/40"
              />
              <button
                onClick={runSql}
                disabled={busy || !sql.trim()}
                className="no-drag inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run
              </button>
            </div>

            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
              {result ? (
                <ResultTable result={result} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-fg-subtle">Select a table or run a query.</p>
                </div>
              )}
            </div>
            {result && (
              <div className="border-t border-white/[0.06] px-3 py-1.5 text-[11px] text-fg-subtle">
                {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ResultTable({ result }: { result: DbQueryResult }) {
  if (result.columns.length === 0) {
    return <p className="p-4 text-xs text-fg-subtle">No columns.</p>;
  }
  return (
    <table className="w-full min-w-max border-collapse text-left font-mono text-[12px]">
      <thead className="sticky top-0 bg-panel">
        <tr>
          {result.columns.map((c) => (
            <th
              key={c}
              className="border-b border-white/[0.08] px-3 py-1.5 font-semibold text-fg-muted"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row, i) => (
          <tr key={i} className="hover:bg-white/[0.02]">
            {row.map((cell, j) => (
              <td
                key={j}
                className="border-b border-white/[0.04] px-3 py-1 text-fg-muted"
              >
                {cell === null ? (
                  <span className="italic text-fg-subtle/60">null</span>
                ) : (
                  cell
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
