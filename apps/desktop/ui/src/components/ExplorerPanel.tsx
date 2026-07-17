import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  FileWarning,
  Check,
  X,
  ListTree,
} from "lucide-react";
import type { FileNode, Symbol as DocSymbol } from "@/lib/types";
import {
  readDir,
  readFile,
  writeFile,
  createFile,
  createDir,
  renamePath,
  deletePath,
  fileSymbols,
  isTauri,
} from "@/lib/ipc";
import { CodeEditor } from "@/components/CodeEditor";
import { useEditorStore, activeTab, type EditorTab } from "@/store/editor";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/cn";

/** File-operation callbacks threaded down the tree. */
interface TreeOps {
  refreshToken: number;
  create: (dir: string, name: string, isDir: boolean) => void;
  rename: (fromPath: string, toName: string) => void;
  remove: (path: string) => void;
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/[/\\]$/, "")}/${name}`;
}
function parentDir(p: string): string {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i >= 0 ? p.slice(0, i) : p;
}

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
  const revealLine = useEditorStore((s) => s.revealLine);
  const setCursor = useEditorStore((s) => s.setCursor);
  const active = useEditorStore(activeTab);
  const [showOutline, setShowOutline] = useState(false);

  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [rootCreate, setRootCreate] = useState<null | "file" | "folder">(null);
  const pushToast = useAppStore((s) => s.pushToast);

  const bump = useCallback(() => setRefreshToken((n) => n + 1), []);

  // Close any editor tab that pointed at a path we just removed or renamed away.
  const dropTabsUnder = useCallback((p: string) => {
    const st = useEditorStore.getState();
    st.tabs
      .filter((t) => t.path === p || t.path.startsWith(`${p}/`) || t.path.startsWith(`${p}\\`))
      .forEach((t) => st.closeTab(t.path));
  }, []);

  const create = useCallback(
    (dir: string, name: string, isDir: boolean) => {
      const target = joinPath(dir, name);
      void (isDir ? createDir(target) : createFile(target))
        .then(bump)
        .catch((e) =>
          pushToast({ variant: "error", title: "Create failed", description: String(e) }),
        );
    },
    [bump, pushToast],
  );

  const rename = useCallback(
    (fromPath: string, toName: string) => {
      void renamePath(fromPath, joinPath(parentDir(fromPath), toName))
        .then(() => {
          dropTabsUnder(fromPath);
          bump();
        })
        .catch((e) =>
          pushToast({ variant: "error", title: "Rename failed", description: String(e) }),
        );
    },
    [bump, dropTabsUnder, pushToast],
  );

  const remove = useCallback(
    (p: string) => {
      void deletePath(p)
        .then(() => {
          dropTabsUnder(p);
          bump();
        })
        .catch((e) =>
          pushToast({ variant: "error", title: "Delete failed", description: String(e) }),
        );
    },
    [bump, dropTabsUnder, pushToast],
  );

  const ops: TreeOps = { refreshToken, create, rename, remove };

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
    <div className="flex h-full overflow-hidden rounded-lg border border-border bg-panel">
      <aside className="scrollbar-thin flex w-64 shrink-0 flex-col overflow-y-auto border-r border-white/[0.06]">
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-2 py-1.5">
          <span className="mr-auto truncate pl-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            Explorer
          </span>
          <button
            onClick={() => setRootCreate("file")}
            title="New file"
            className="no-drag rounded p-1 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setRootCreate("folder")}
            title="New folder"
            className="no-drag rounded p-1 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 py-2">
          {rootCreate && (
            <NameInput
              icon={rootCreate === "folder" ? "folder" : "file"}
              depth={0}
              onSubmit={(name) => {
                create(root, name, rootCreate === "folder");
                setRootCreate(null);
              }}
              onCancel={() => setRootCreate(null)}
            />
          )}
          <Tree dir={root} depth={0} activePath={activePath} onOpen={openFile} ops={ops} />
        </div>
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
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-1 text-xs">
                {/* Breadcrumbs — the file's path within the project. */}
                <div className="flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-[11px] text-fg-subtle">
                  {breadcrumbs(root, active.path).map((seg, i, arr) => (
                    <span key={i} className="flex shrink-0 items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                      <span className={i === arr.length - 1 ? "text-fg-muted" : ""}>
                        {seg}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2 text-fg-subtle">
                  <button
                    onClick={() => setShowOutline((v) => !v)}
                    title="Toggle outline"
                    className={cn(
                      "no-drag ml-1 inline-flex items-center rounded-md px-1.5 py-1 transition-colors",
                      showOutline ? "bg-accent/15 text-accent" : "text-fg-subtle hover:text-fg",
                    )}
                  >
                    <ListTree className="h-3.5 w-3.5" />
                  </button>
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
                  reveal={active.reveal}
                  onChange={(v) => updateDraft(active.path, v)}
                  onCursor={(line, col) => setCursor(line, col)}
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

      {showOutline && active && !active.contents.binary && (
        <OutlinePanel
          text={active.draft}
          language={active.contents.language}
          onReveal={(line) => revealLine(active.path, line)}
        />
      )}
    </div>
  );
}

/** A syntactic symbol outline for the active file; click to jump to the line. */
function OutlinePanel({
  text,
  language,
  onReveal,
}: {
  text: string;
  language?: string | null;
  onReveal: (line: number) => void;
}) {
  const [symbols, setSymbols] = useState<DocSymbol[]>([]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      fileSymbols(text, language).then((s) => {
        if (!cancelled) setSymbols(s);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, language]);

  return (
    <aside className="scrollbar-thin flex w-56 shrink-0 flex-col overflow-y-auto border-l border-white/[0.06]">
      <div className="border-b border-white/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        Outline
      </div>
      {symbols.length === 0 ? (
        <p className="px-3 py-3 text-xs text-fg-subtle">No symbols.</p>
      ) : (
        <ul className="py-1">
          {symbols.map((s, i) => (
            <li key={`${s.line}:${i}`}>
              <button
                onClick={() => onReveal(s.line)}
                className="no-drag flex w-full items-center gap-2 px-3 py-1 text-left text-[13px] text-fg-muted transition-colors hover:bg-white/[0.04]"
                title={`${s.kind} · line ${s.line}`}
              >
                <span className="w-8 shrink-0 rounded bg-white/[0.06] px-1 text-center text-[9px] uppercase text-fg-subtle">
                  {s.kind.slice(0, 3)}
                </span>
                <span className="truncate">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
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
    <div className="scrollbar-thin flex shrink-0 items-stretch overflow-x-auto border-b border-border bg-panel">
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        return (
          <div
            key={tab.path}
            onClick={() => onSelect(tab.path)}
            className={cn(
              "no-drag group flex max-w-[200px] cursor-pointer items-center gap-1.5 border-r border-border border-b-2 px-3 py-2 text-[13px] transition-colors",
              isActive
                ? "border-b-accent bg-elevated text-fg"
                : "border-b-transparent text-fg-muted hover:bg-white/[0.02]",
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
  ops,
}: {
  dir: string;
  depth: number;
  activePath: string | null;
  onOpen: (path: string) => void;
  ops: TreeOps;
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
    // Re-read when this dir changes or a file op bumps the refresh token.
  }, [dir, ops.refreshToken]);

  if (!nodes) {
    return (
      <div className="px-3 py-1" style={{ paddingLeft: depth * 12 + 12 }}>
        <Loader2 className="h-3 w-3 animate-spin text-fg-subtle" />
      </div>
    );
  }

  return (
    <ul>
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={depth}
          activePath={activePath}
          expanded={expanded.has(node.path)}
          onToggle={() =>
            setExpanded((prev) => {
              const next = new Set(prev);
              if (next.has(node.path)) next.delete(node.path);
              else next.add(node.path);
              return next;
            })
          }
          onOpen={onOpen}
          ops={ops}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  depth,
  activePath,
  expanded,
  onToggle,
  onOpen,
  ops,
}: {
  node: FileNode;
  depth: number;
  activePath: string | null;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (path: string) => void;
  ops: TreeOps;
}) {
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [creatingIn, setCreatingIn] = useState<null | "file" | "folder">(null);
  const pad = depth * 12 + 8;

  if (renaming) {
    return (
      <li>
        <NameInput
          icon={node.isDir ? "folder" : "file"}
          depth={depth}
          initial={node.name}
          onSubmit={(name) => {
            setRenaming(false);
            if (name !== node.name) ops.rename(node.path, name);
          }}
          onCancel={() => setRenaming(false)}
        />
      </li>
    );
  }

  return (
    <li>
      <div
        className={cn(
          "no-drag group flex items-center gap-1.5 pr-1 text-[13px] transition-colors hover:bg-white/[0.04]",
          activePath === node.path ? "bg-accent/10 text-fg" : "text-fg-muted",
          node.hidden && "opacity-60",
        )}
      >
        <button
          onClick={() => (node.isDir ? onToggle() : onOpen(node.path))}
          className="no-drag flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
          style={{ paddingLeft: pad }}
        >
          {node.isDir ? (
            <>
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
              {expanded ? (
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

        {/* Row actions */}
        {confirmDelete ? (
          <span className="flex shrink-0 items-center gap-0.5 pr-1">
            <span className="text-[10px] text-danger">Delete?</span>
            <RowBtn label="Confirm delete" onClick={() => ops.remove(node.path)}>
              <Check className="h-3 w-3 text-danger" />
            </RowBtn>
            <RowBtn label="Cancel" onClick={() => setConfirmDelete(false)}>
              <X className="h-3 w-3" />
            </RowBtn>
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-0.5 pr-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {node.isDir && (
              <>
                <RowBtn
                  label="New file"
                  onClick={() => {
                    if (!expanded) onToggle();
                    setCreatingIn("file");
                  }}
                >
                  <FilePlus className="h-3 w-3" />
                </RowBtn>
                <RowBtn
                  label="New folder"
                  onClick={() => {
                    if (!expanded) onToggle();
                    setCreatingIn("folder");
                  }}
                >
                  <FolderPlus className="h-3 w-3" />
                </RowBtn>
              </>
            )}
            <RowBtn label="Rename" onClick={() => setRenaming(true)}>
              <Pencil className="h-3 w-3" />
            </RowBtn>
            <RowBtn label="Delete" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3 w-3" />
            </RowBtn>
          </span>
        )}
      </div>

      {node.isDir && expanded && (
        <>
          {creatingIn && (
            <NameInput
              icon={creatingIn === "folder" ? "folder" : "file"}
              depth={depth + 1}
              onSubmit={(name) => {
                ops.create(node.path, name, creatingIn === "folder");
                setCreatingIn(null);
              }}
              onCancel={() => setCreatingIn(null)}
            />
          )}
          <Tree
            dir={node.path}
            depth={depth + 1}
            activePath={activePath}
            onOpen={onOpen}
            ops={ops}
          />
        </>
      )}
    </li>
  );
}

function RowBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="no-drag flex h-5 w-5 items-center justify-center rounded text-fg-subtle hover:bg-white/[0.08] hover:text-fg"
    >
      {children}
    </button>
  );
}

/** An inline text input for naming a new/renamed entry. */
function NameInput({
  icon,
  depth,
  initial = "",
  onSubmit,
  onCancel,
}: {
  icon: "file" | "folder";
  depth: number;
  initial?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div
      className="flex items-center gap-1.5 py-0.5 pr-2"
      style={{ paddingLeft: depth * 12 + 8 }}
    >
      {icon === "folder" ? (
        <Folder className="h-3.5 w-3.5 shrink-0 text-accent/80" />
      ) : (
        <FileIcon className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      )}
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const name = value.trim();
            if (name) onSubmit(name);
            else onCancel();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        className="no-drag min-w-0 flex-1 rounded border border-accent/40 bg-black/40 px-1 py-0.5 text-[13px] text-fg outline-none"
      />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center">{children}</div>;
}

function relative(root: string, path: string): string {
  return path.startsWith(root) ? path.slice(root.length).replace(/^[/\\]/, "") : path;
}

/** The active file's path within the project, as breadcrumb segments. */
function breadcrumbs(root: string, path: string): string[] {
  return relative(root, path)
    .split(/[/\\]/)
    .filter(Boolean);
}
