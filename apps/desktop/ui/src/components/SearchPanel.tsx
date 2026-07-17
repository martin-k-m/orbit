import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search as SearchIcon,
  Loader2,
  CaseSensitive,
  WholeWord,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { FileMatches, SearchResults } from "@/lib/types";
import { searchWorkspace, isTauri } from "@/lib/ipc";
import { cn } from "@/lib/cn";

/**
 * Find-in-files across a project. Types debounce into a single engine call
 * (`search_workspace`), and clicking a match opens the file in the editor at
 * that line via `onOpen`.
 */
export function SearchPanel({
  root,
  onOpen,
}: {
  root: string;
  onOpen: (path: string, line: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [busy, setBusy] = useState(false);

  // Each search supersedes the last; a stale response must not overwrite a newer
  // one, so we tag every request and ignore all but the most recent.
  const reqId = useRef(0);

  const run = useCallback(
    async (q: string, cs: boolean, ww: boolean) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults(null);
        setBusy(false);
        return;
      }
      const id = ++reqId.current;
      setBusy(true);
      try {
        const res = await searchWorkspace(root, trimmed, cs, ww);
        if (id === reqId.current) setResults(res);
      } finally {
        if (id === reqId.current) setBusy(false);
      }
    },
    [root],
  );

  // Debounce typing so we don't launch a walk on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => void run(query, caseSensitive, wholeWord), 250);
    return () => clearTimeout(t);
  }, [query, caseSensitive, wholeWord, run]);

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <SearchIcon className="h-4 w-4 shrink-0 text-fg-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isTauri() ? "Search this project…" : "Search (desktop app only)"}
          className="no-drag min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-fg-subtle" />}
        <Toggle
          on={caseSensitive}
          onClick={() => setCaseSensitive((v) => !v)}
          label="Match case"
        >
          <CaseSensitive className="h-4 w-4" />
        </Toggle>
        <Toggle
          on={wholeWord}
          onClick={() => setWholeWord((v) => !v)}
          label="Whole word"
        >
          <WholeWord className="h-4 w-4" />
        </Toggle>
      </div>

      {results && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-1.5 text-[11px] text-fg-subtle">
          <span>
            {results.matchCount} {results.matchCount === 1 ? "result" : "results"} in{" "}
            {results.fileCount} {results.fileCount === 1 ? "file" : "files"}
          </span>
          {results.truncated && <span className="text-warning">· showing the first matches</span>}
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto py-1">
        {results && results.files.length === 0 && query.trim() && !busy ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-fg-subtle">No matches.</p>
          </div>
        ) : (
          results?.files.map((file) => (
            <FileGroup
              key={file.path}
              root={root}
              file={file}
              termLen={[...query.trim()].length}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FileGroup({
  root,
  file,
  termLen,
  onOpen,
}: {
  root: string;
  file: FileMatches;
  termLen: number;
  onOpen: (path: string, line: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="no-drag flex w-full items-center gap-1.5 px-2 py-1 text-left text-[13px] text-fg-muted transition-colors hover:bg-white/[0.04]"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        )}
        <FileText className="h-3.5 w-3.5 shrink-0 text-accent/80" />
        <span className="truncate font-medium">{file.name}</span>
        <span className="truncate text-[11px] text-fg-subtle">{relative(root, file.path)}</span>
        <span className="ml-auto shrink-0 rounded bg-white/[0.06] px-1.5 text-[10px] text-fg-subtle">
          {file.matches.length}
        </span>
      </button>

      {!collapsed &&
        file.matches.map((m, i) => (
          <button
            key={`${m.line}:${m.column}:${i}`}
            onClick={() => onOpen(file.path, m.line)}
            className="no-drag flex w-full items-baseline gap-2 py-0.5 pl-9 pr-2 text-left font-mono text-[12px] text-fg-muted transition-colors hover:bg-accent/10"
            title={`Line ${m.line}`}
          >
            <span className="w-8 shrink-0 text-right text-fg-subtle">{m.line}</span>
            <span className="truncate">
              {highlight(m.text, m.column - 1, termLen, m.matchEnd > m.matchStart)}
            </span>
          </button>
        ))}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      title={label}
      className={cn(
        "no-drag flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors",
        on ? "bg-accent/20 text-accent" : "text-fg-subtle hover:bg-white/[0.06]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Render `text` with the matched span highlighted, indexing by character so
 * multibyte lines line up. `start` is a 0-based character index; `len` the
 * match length in characters. When `visible` is false (the engine trimmed the
 * line past the match), the text is shown without a highlight.
 */
function highlight(text: string, start: number, len: number, visible: boolean) {
  const chars = [...text];
  if (!visible || start < 0 || start >= chars.length || len <= 0) return text;
  const end = Math.min(start + len, chars.length);
  return (
    <>
      {chars.slice(0, start).join("")}
      <mark className="rounded bg-accent/30 text-fg">{chars.slice(start, end).join("")}</mark>
      {chars.slice(end).join("")}
    </>
  );
}

function relative(root: string, path: string): string {
  return path.startsWith(root) ? path.slice(root.length).replace(/^[/\\]/, "") : path;
}
