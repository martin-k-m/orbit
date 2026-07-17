import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/store/app";
import { isTauri, listProjects, getSetting } from "@/lib/ipc";
import type { Theme } from "@/store/app";

export default function App() {
  const setProjects = useAppStore((s) => s.setProjects);
  const setTheme = useAppStore((s) => s.setTheme);
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);

  // Bootstrap: load persisted theme + projects.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await getSetting("theme");
      if (!cancelled && (stored === "dark" || stored === "light")) {
        setTheme(stored as Theme);
      } else {
        setTheme("dark");
      }
      const projects = await listProjects();
      if (!cancelled) setProjects(projects);
    })();

    return () => {
      cancelled = true;
    };
  }, [setProjects, setTheme]);

  // Listen for the native menu event that opens the command palette.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("menu:command-palette", () => {
        setPaletteOpen(true);
      });
    })();

    return () => {
      unlisten?.();
    };
  }, [setPaletteOpen]);

  return <AppShell />;
}
