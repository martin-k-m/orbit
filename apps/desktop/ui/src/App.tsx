import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Splash } from "@/components/Splash";
import { useAppStore, watchSystemTheme } from "@/store/app";
import { loadEditorPrefs } from "@/store/settings";
import { isTauri, listProjects, getSetting } from "@/lib/ipc";
import type { Theme } from "@/store/app";

export default function App() {
  const setProjects = useAppStore((s) => s.setProjects);
  const setTheme = useAppStore((s) => s.setTheme);
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);

  // `booting` drives the splash: true until bootstrap finishes (with a small
  // minimum so it never flashes); `showSplash` keeps it mounted through the fade.
  const [booting, setBooting] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Bootstrap: load persisted theme + projects.
  useEffect(() => {
    let cancelled = false;

    // Follow the OS while the preference is "system"; stays live if the OS flips.
    const unwatch = watchSystemTheme();

    (async () => {
      // Hold the splash at least this long so a fast boot still reads as a launch.
      const minShown = new Promise((r) => setTimeout(r, 1100));

      const stored = await getSetting("theme");
      const valid: Theme[] = ["dark", "light", "system"];
      if (!cancelled && valid.includes(stored as Theme)) {
        setTheme(stored as Theme);
      } else {
        setTheme("dark");
      }
      await loadEditorPrefs();
      const projects = await listProjects();
      if (!cancelled) setProjects(projects);

      await minShown;
      if (!cancelled) setBooting(false);
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

  return (
    <>
      <AppShell />
      {showSplash && (
        <Splash hidden={!booting} onHidden={() => setShowSplash(false)} />
      )}
    </>
  );
}
