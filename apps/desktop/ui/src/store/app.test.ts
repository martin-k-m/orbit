import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./app";

function reset() {
  useAppStore.setState({
    projects: [],
    selectedProjectId: null,
    view: { kind: "dashboard" },
    theme: "dark",
    paletteOpen: false,
    toasts: [],
  });
}

describe("app store", () => {
  beforeEach(reset);

  it("navigates between views", () => {
    useAppStore.getState().navigate({ kind: "analytics" });
    expect(useAppStore.getState().view).toEqual({ kind: "analytics" });
    expect(useAppStore.getState().selectedProjectId).toBeNull();
  });

  it("opens a project and tracks the selection", () => {
    useAppStore.getState().openProject("abc", "/tmp/demo");
    const state = useAppStore.getState();
    expect(state.view).toEqual({ kind: "project", id: "abc", path: "/tmp/demo" });
    expect(state.selectedProjectId).toBe("abc");
  });

  it("cycles the theme dark -> light -> system -> dark", () => {
    // The palette's "toggle theme" is the only way to reach every option, so
    // the cycle must include "system" and wrap.
    expect(useAppStore.getState().theme).toBe("dark");
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().theme).toBe("light");
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().theme).toBe("system");
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().theme).toBe("dark");
  });

  it("applies a resolved surface class, never 'system'", () => {
    // "system" is a preference, not a surface — the DOM must always end up
    // either .dark or .light or the theme tokens have no values.
    useAppStore.getState().setTheme("system");
    const root = document.documentElement;
    expect(root.classList.contains("dark") || root.classList.contains("light")).toBe(
      true,
    );
    expect(root.classList.contains("system")).toBe(false);
  });

  it("controls the command palette", () => {
    expect(useAppStore.getState().paletteOpen).toBe(false);
    useAppStore.getState().togglePalette();
    expect(useAppStore.getState().paletteOpen).toBe(true);
    useAppStore.getState().setPaletteOpen(false);
    expect(useAppStore.getState().paletteOpen).toBe(false);
  });

  it("pushes and dismisses toasts", () => {
    useAppStore.getState().pushToast({ title: "Saved", variant: "success" });
    const toasts = useAppStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe("Saved");
    useAppStore.getState().dismissToast(toasts[0].id);
    expect(useAppStore.getState().toasts).toHaveLength(0);
  });
});
