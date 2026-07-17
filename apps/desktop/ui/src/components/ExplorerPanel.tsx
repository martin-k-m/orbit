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
  X,
} from "lucide-react";
import type { Encoding, FileNode, LineEnding } from "@/lib/types";
import { readDir, readFile, writeFile, isTauri } from "@/lib/ipc";
import { CodeEditor } from "@/components/CodeEditor";
import { useEditorStore, activeTab, type EditorTab } from "@/store/editor";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * A lazily-expanded file tree beside a tabbed CodeMirror editor.
 *
 * Open files live in `useEditorStore`, so switching between them keeps each
 * one's scroll-free draft and dirty state — the multi-file editing an IDE needs
 * rather than the single-buffer "last file wins" the panel started with.
 */
export function ExplorerPanel({ root }: { root: string }) {
  const tabs = useEditorStore((s) => s.tabs);
  const activePath = useEditorStore((s) => s.activePath);
  const openTab = useEditorStore((s) => s.openTab);
  const setActive = useEditorStore((s) => s.setActive);
  const closeTab = useEditorStore((s) => s.closeTab);
  const updateDraft = useEditorStore((s) => s.updateDraft);
  const markSaved = useEditorStore((s) => s.markSaved);
  const active = useEditorStore(activeTab);

  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The editor store is global, but a switch to another project remounts this
  // panel with a new root while the old project's tabs linger. Drop any tab
  // that doesn't belong under this root so files never bleed across projects.
  // (Toggling ProjectView's own tabs remounts us with the *same* root, so those
  // tabs are kept — only a genuine project change clears them.)
  useEffect(() => {
    const foreign = useEditorStore
      .getState()
      .tabs.some((t) => !t.path.startsWith(root));
    if (foreign) useEditorStore.getState().closeAll();
  }, [root]);

  const openFile = useCallback(
    async (path: string) => {
      // Already open — just focus it, no re-read.
      if (useEditorStore.getState().tabs.some((t) => t.path === path)) {
        setActive(path);
        return;
      }
      setLoadingPath(path);
      try {
        const contents = await readFile(path);
        openTab(path, contents);
      } finally {
        setLoadingPath(null);
      }
    },
    [openTab, setActive],
  );

  const save = useCallback(async () => {
    const tab = useEditorStore.getState().tabs.find(
      (t) => t.path === useEditorStore.getState().activePath,
    );
    if (!tab || !tab.dirty || tab.contents.truncated) return;
    setSaving(true);
    try {
      await writeFile(tab.path, tab.draft);
      markSaved(tab.path);
    } finally {
      setSaving(false);
    }
  }, [markSaved]);

  // Ctrl/Cmd+S saves the active tab; Ctrl/Cmd+W closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void save();
      } else if (key === "w") {
        const path = useEditorStore.getState().activePath;
        if (path) {
          e.preventDefault();
          closeTab(path);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, closeTab]);

  return (
    <div className="flex h-[520px] overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
      <aside className="scrollbar-thin w-64 shrink-0 overflow-y-auto border-r border-white/[0.06] py-2">
        <Tree dir={root} depth={0} activePath={activePath} onOpen={openFile} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {tabs.length > 0 ? (
          <>
            <TabStrip
              tabs={tabs}
              activePath={activePath}
              onSelect={setActive}
              onClose={closeTab}
            />

            {active && (
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-1.5 text-xs">
                <span className="truncate font-mono text-fg-muted">
                  {relative(root, active.path)}
                </span>
                <div className="ml-auto flex items-center gap-2 text-fg-subtle">
                  {!active.contents.binary && (
                    <>
                      <span>{active.contents.language ?? "text"}</span>
                      <span>·</span>
                      <span>{encodingLabel(active.contents.encoding)}</span>
                      <span>·</span>
                      <span>{lineEndingLabel(active.contents.lineEnding)}</span>
                      <span>·</span>
                      <span>{formatBytes(active.contents.size)}</span>
                    </>
                  )}
                  <button
                    onClick={save}
                    disabled={!active.dirty || saving || active.contents.truncated}
                    className={cn(
                      "no-drag ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
                      active.dirty && !active.contents.truncated
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
            )}

            <div className="min-h-0 flex-1">
              {loadingPath && !active ? (
                <Centered>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Centered>
              ) : active?.contents.binary ? (
                <Centered>
                  <div className="flex flex-col items-center gap-2 text-fg-subtle">
                    <FileWarning className="h-5 w-5" />
                    <span className="text-xs">Binary file — not shown</span>
                  </div>
                </Centered>
              ) : active ? (
                <CodeEditor
                  path={active.path}
                  value={active.draft}
                  language={active.contents.language}
                  readOnly={active.contents.truncated}
                  onChange={(v) => updateDraft(active.path, v)}
                />
              ) : null}
            </div>
            {active?.contents.truncated && (
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

/** The horizontal strip of open-file tabs above the editor. */
function TabStrip({
  tabs,
  activePath,
  onSelect,
  onClose,
}: {
  tabs: EditorTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}) {
  return (
    <div className="scrollbar-thin flex shrink-0 items-stretch overflow-x-auto border-b border-white/[0.06] bg-black/20">
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        return (
          <div
            key={tab.path}
            onClick={() => onSelect(tab.path)}
            className={cn(
              "no-drag group flex max-w-[200px] cursor-pointer items-center gap-1.5 border-r border-white/[0.06] px-3 py-2 text-[13px] transition-colors",
              isActive
                ? "bg-white/[0.05] text-fg"
                : "text-fg-muted hover:bg-white/[0.02]",
            )}
            title={tab.path}
          >
            <span className="truncate">{tab.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              className="no-drag ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-white/[0.08]"
              aria-label={`Close ${tab.name}`}
            >
              {tab.dirty ? (
                // A dirty tab shows a dot that becomes the close affordance on hover.
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent group-hover:hidden" />
                  <X className="hidden h-3 w-3 group-hover:block" />
                </>
              ) : (
                <X className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Tree({
  dir,
  depth,
  activePath,
  onOpen,
}: {
  dir: string;
  depth: number;
  activePath: string | null;
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
                activePath === node.path ? "bg-accent/10 text-fg" : "text-fg-muted",
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
              <Tree dir={node.path} depth={depth + 1} activePath={activePath} onOpen={onOpen} />
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

function encodingLabel(e: Encoding): string {
  return e === "utf-16-le" ? "UTF-16 LE" : e === "utf-16-be" ? "UTF-16 BE" : "UTF-8";
}
function lineEndingLabel(l: LineEnding): string {
  return l === "crlf" ? "CRLF" : l === "lf" ? "LF" : "—";
}
