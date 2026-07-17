import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  Folder,
  FolderOpen,
  Save,
  Loader2,
  FileWarning,
} from "lucide-react";
import type { FileContents, FileNode } from "@/lib/types";
import { readDir, readFile, writeFile, isTauri } from "@/lib/ipc";
import { CodeEditor } from "@/components/CodeEditor";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";

/** A lazily-expanded file tree beside a CodeMirror editor. */
export function ExplorerPanel({ root }: { root: string }) {
  const [open, setOpen] = useState<FileContents | null>(null);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const openFile = useCallback(async (path: string) => {
    setLoading(true);
    setOpenPath(path);
    try {
      const contents = await readFile(path);
      setOpen(contents);
      setDraft(contents.text);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, []);

  async function save() {
    if (!openPath || !dirty) return;
    setSaving(true);
    try {
      await writeFile(openPath, draft);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPath, dirty, draft]);

  return (
    <div className="flex h-[520px] overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
      <aside className="scrollbar-thin w-64 shrink-0 overflow-y-auto border-r border-white/[0.06] py-2">
        <Tree dir={root} depth={0} openPath={openPath} onOpen={openFile} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {openPath ? (
          <>
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-xs">
              <span className="truncate font-mono text-fg-muted">
                {relative(root, openPath)}
              </span>
              {dirty && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              <div className="ml-auto flex items-center gap-2 text-fg-subtle">
                {open && !open.binary && (
                  <>
                    <span>{open.language ?? "text"}</span>
                    <span>·</span>
                    <span>{encodingLabel(open.encoding)}</span>
                    <span>·</span>
                    <span>{lineEndingLabel(open.lineEnding)}</span>
                    <span>·</span>
                    <span>{formatBytes(open.size)}</span>
                  </>
                )}
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className={cn(
                    "no-drag ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
                    dirty
                      ? "bg-accent/15 text-accent hover:bg-accent/25"
                      : "text-fg-subtle",
                  )}
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              {loading ? (
                <Centered>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Centered>
              ) : open?.binary ? (
                <Centered>
                  <div className="flex flex-col items-center gap-2 text-fg-subtle">
                    <FileWarning className="h-5 w-5" />
                    <span className="text-xs">Binary file — not shown</span>
                  </div>
                </Centered>
              ) : (
                <CodeEditor
                  path={openPath}
                  value={draft}
                  language={open?.language}
                  onChange={(v) => {
                    setDraft(v);
                    setDirty(v !== open?.text);
                  }}
                />
              )}
            </div>
            {open?.truncated && (
              <div className="border-t border-white/[0.06] px-3 py-1.5 text-[11px] text-warning">
                Large file — showing the first 5 MB. Saving would truncate it, so
                editing is disabled for safety.
              </div>
            )}
          </>
        ) : (
          <Centered>
            <p className="text-sm text-fg-subtle">
              {isTauri()
                ? "Select a file to open it."
                : "Editor preview — open the desktop app for real files."}
            </p>
          </Centered>
        )}
      </section>
    </div>
  );
}

function Tree({
  dir,
  depth,
  openPath,
  onOpen,
}: {
  dir: string;
  depth: number;
  openPath: string | null;
  onOpen: (path: string) => void;
}) {
  const [nodes, setNodes] = useState<FileNode[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    readDir(dir).then((n) => {
      if (!cancelled) setNodes(n);
    });
    return () => {
      cancelled = true;
    };
  }, [dir]);

  if (!nodes) {
    return (
      <div className="px-3 py-1" style={{ paddingLeft: depth * 12 + 12 }}>
        <Loader2 className="h-3 w-3 animate-spin text-fg-subtle" />
      </div>
    );
  }

  return (
    <ul>
      {nodes.map((node) => {
        const isOpen = expanded.has(node.path);
        return (
          <li key={node.path}>
            <button
              onClick={() => {
                if (node.isDir) {
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(node.path)) next.delete(node.path);
                    else next.add(node.path);
                    return next;
                  });
                } else {
                  onOpen(node.path);
                }
              }}
              className={cn(
                "no-drag flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[13px] transition-colors hover:bg-white/[0.04]",
                openPath === node.path ? "bg-accent/10 text-fg" : "text-fg-muted",
                node.hidden && "opacity-60",
              )}
              style={{ paddingLeft: depth * 12 + 8 }}
            >
              {node.isDir ? (
                <>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {isOpen ? (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent/80" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-accent/80" />
                  )}
                </>
              ) : (
                <FileIcon className="ml-[14px] h-3.5 w-3.5 shrink-0 text-fg-subtle" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            {node.isDir && isOpen && (
              <Tree dir={node.path} depth={depth + 1} openPath={openPath} onOpen={onOpen} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center">{children}</div>;
}

function relative(root: string, path: string): string {
  return path.startsWith(root) ? path.slice(root.length).replace(/^[/\\]/, "") : path;
}

function encodingLabel(e: FileContents["encoding"]): string {
  return e === "utf-16-le" ? "UTF-16 LE" : e === "utf-16-be" ? "UTF-16 BE" : "UTF-8";
}
function lineEndingLabel(l: FileContents["lineEnding"]): string {
  return l === "crlf" ? "CRLF" : l === "lf" ? "LF" : "—";
}
