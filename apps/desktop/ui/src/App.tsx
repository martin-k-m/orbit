import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAppStore, watchSystemTheme } from "@/store/app";
import { isTauri, listProjects, getSetting } from "@/lib/ipc";
import type { Theme } from "@/store/app";

export default function App() {
  const setProjects = useAppStore((s) => s.setProjects);
  const setTheme = useAppStore((s) => s.setTheme);
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);

  // Bootstrap: load persisted theme + projects.
  useEffect(() => {
    let cancelled = false;

    // Follow the OS while the preference is "system"; stays live if the OS flips.
    const unwatch = watchSystemTheme();

    (async () => {
      const stored = await getSetting("theme");
      const valid: Theme[] = ["dark", "light", "system"];
      if (!cancelled && valid.includes(stored as Theme)) {
        setTheme(stored as Theme);
      } else {
        setTheme("dark");
      }
      const projects = await listProjects();
      if (!cancelled) setProjects(projects);
    })();

    return () => {
      cancelled = true;
      unwatch();
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
