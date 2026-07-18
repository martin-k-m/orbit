import { useEffect, useState } from "react";
import { Command, Search, Sun, Moon } from "lucide-react";
import { useAppStore } from "@/store/app";
import { OrbitGlyph } from "@/components/OrbitGlyph";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent);
}

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Projects",
  analytics: "Analytics",
  docker: "Containers",
  database: "Database",
  apis: "APIs",
  plugins: "Plugins",
  settings: "Settings",
};

/** Custom draggable window titlebar. Reserves space for OS window controls. */
export function TitleBar() {
  const togglePalette = useAppStore((s) => s.togglePalette);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const theme = useAppStore((s) => s.theme);
  const view = useAppStore((s) => s.view);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const [pad, setPad] = useState(12);

  useEffect(() => {
    // Reserve 78px on macOS for the traffic lights.
    setPad(isMac() ? 78 : 12);
  }, []);

  // The centre shows what you're looking at, IDE-style — not a marketing banner.
  const context =
    view.kind === "project"
      ? projects.find((p) => p.id === selectedProjectId)?.name ?? "Project"
      : VIEW_TITLES[view.kind] ?? "";

  return (
    <div
      data-tauri-drag-region
      className="relative z-30 flex h-9 shrink-0 items-center border-b border-border bg-elevated"
      style={{ paddingLeft: pad, paddingRight: 12 }}
    >
      <div
        data-tauri-drag-region
        className="pointer-events-none flex items-center gap-2"
      >
        <OrbitGlyph className="h-4 w-4 opacity-90" />
        <span className="text-[13px] font-medium text-fg-muted">Orbit</span>
      </div>

      {/* Current context, centred and dimmed. */}
      <div
        data-tauri-drag-region
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 truncate text-xs text-fg-subtle"
      >
        {context}
      </div>

      <div className="no-drag ml-auto flex items-center gap-1.5">
        <button
          onClick={togglePalette}
          className="no-drag group flex h-7 items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-2.5 text-xs text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg-muted"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search or run…</span>
          <kbd className="ml-1 hidden items-center gap-0.5 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle sm:inline-flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <Hint label={theme === "dark" ? "Light mode" : "Dark mode"}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </Hint>
      </div>
    </div>
  );
}
