import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  BarChart3,
  Container,
  Database,
  Globe,
  Settings as SettingsIcon,
  FolderPlus,
  TerminalSquare,
  ScanSearch,
  SunMoon,
  FolderGit2,
  FileCode2,
  CornerDownLeft,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/app";
import { addProject, listFiles, openTerminal, pickFolder, scanFolder } from "@/lib/ipc";
import { LANGUAGE_META } from "@/lib/types";

export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen);
  const setOpen = useAppStore((s) => s.setPaletteOpen);
  const navigate = useAppStore((s) => s.navigate);
  const openProject = useAppStore((s) => s.openProject);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const requestOpenFile = useAppStore((s) => s.requestOpenFile);
  const pushToast = useAppStore((s) => s.pushToast);

  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  // Global Cmd/Ctrl+K shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useAppStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  function run(action: () => void | Promise<void>) {
    setOpen(false);
    void action();
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Load the current project's file list once the palette opens, for quick-open.
  useEffect(() => {
    if (!open || !selectedProject) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    listFiles(selectedProject.path).then((f) => {
      if (!cancelled) setFiles(f);
    });
    return () => {
      cancelled = true;
    };
  }, [open, selectedProject?.id, selectedProject?.path]);

  // Only surface files once the user types, capped, so the list stays snappy.
  const fileMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !selectedProject) return [];
    return files.filter((f) => f.toLowerCase().includes(q)).slice(0, 40);
  }, [query, files, selectedProject]);

  async function handleAdd() {
    const path = await pickFolder();
    if (!path) return;
    const next = await addProject(path);
    setProjects(next);
    pushToast({ variant: "success", title: "Project added", description: path });
  }

  async function handleScan() {
    const path = await pickFolder();
    if (!path) return;
    const found = await scanFolder(path);
    setProjects(found);
    pushToast({
      variant: "success",
      title: "Scan complete",
      description: `${found.length} project${found.length === 1 ? "" : "s"} found`,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setQuery("");
          }}
          label="Command palette"
          shouldFilter
          className="fixed inset-0 z-[70]"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute left-1/2 top-[18vh] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-white/[0.08] bg-elevated/95 shadow-lift backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4">
              <ScanSearch className="h-4 w-4 text-fg-subtle" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder={
                  selectedProject
                    ? `Type a command, or search files in ${selectedProject.name}…`
                    : "Type a command or search…"
                }
                className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
              />
            </div>

            <Command.List className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-fg-subtle">
                No results found.
              </Command.Empty>

              <Command.Group
                heading="Navigate"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle"
              >
                <PaletteItem
                  icon={LayoutDashboard}
                  label="Go to Projects"
                  onSelect={() => run(() => navigate({ kind: "dashboard" }))}
                />
                <PaletteItem
                  icon={BarChart3}
                  label="Go to Analytics"
                  onSelect={() => run(() => navigate({ kind: "analytics" }))}
                />
                <PaletteItem
                  icon={Container}
                  label="Go to Containers"
                  onSelect={() => run(() => navigate({ kind: "docker" }))}
                />
                <PaletteItem
                  icon={Database}
                  label="Go to Database"
                  onSelect={() => run(() => navigate({ kind: "database" }))}
                />
                <PaletteItem
                  icon={Globe}
                  label="Go to APIs"
                  onSelect={() => run(() => navigate({ kind: "apis" }))}
                />
                <PaletteItem
                  icon={SettingsIcon}
                  label="Go to Settings"
                  onSelect={() => run(() => navigate({ kind: "settings" }))}
                />
              </Command.Group>

              <Command.Group
                heading="Actions"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle"
              >
                <PaletteItem
                  icon={FolderPlus}
                  label="Add project…"
                  onSelect={() => run(handleAdd)}
                />
                <PaletteItem
                  icon={ScanSearch}
                  label="Scan folder for projects…"
                  onSelect={() => run(handleScan)}
                />
                {selectedProject && (
                  <PaletteItem
                    icon={TerminalSquare}
                    label={`Open terminal in ${selectedProject.name}`}
                    onSelect={() =>
                      run(() => openTerminal(selectedProject.path))
                    }
                  />
                )}
                <PaletteItem
                  icon={SunMoon}
                  label="Toggle theme"
                  onSelect={() => run(toggleTheme)}
                />
              </Command.Group>

              {selectedProject && fileMatches.length > 0 && (
                <Command.Group
                  heading={`Files · ${selectedProject.name}`}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle"
                >
                  {fileMatches.map((f) => (
                    <PaletteItem
                      key={f}
                      icon={FileCode2}
                      label={f}
                      value={`file ${f}`}
                      onSelect={() =>
                        run(() =>
                          requestOpenFile({
                            projectId: selectedProject.id,
                            path: `${selectedProject.path}/${f}`,
                          }),
                        )
                      }
                    />
                  ))}
                </Command.Group>
              )}

              {projects.length > 0 && (
                <Command.Group
                  heading="Projects"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle"
                >
                  {projects.map((p) => (
                    <PaletteItem
                      key={p.id}
                      icon={FolderGit2}
                      label={p.name}
                      hint={LANGUAGE_META[p.primaryLanguage].label}
                      value={`project ${p.name} ${p.path}`}
                      onSelect={() => run(() => openProject(p.id, p.path))}
                    />
                  ))}
                </Command.Group>
              )}
            </Command.List>

            <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] px-4 py-2 text-[11px] text-fg-subtle">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-white/[0.06] px-1 font-mono">esc</kbd>{" "}
                to close
              </span>
            </div>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  hint,
  value,
  onSelect,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  hint?: string;
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-muted transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-fg"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
    </Command.Item>
  );
}
