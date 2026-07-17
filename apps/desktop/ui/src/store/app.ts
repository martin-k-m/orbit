import { create } from "zustand";
import type { ProjectSummary } from "@/lib/types";

export type View =
  | { kind: "dashboard" }
  | { kind: "analytics" }
  | { kind: "ecosystem" }
  | { kind: "settings" }
  | { kind: "project"; id: string; path: string };

export type Theme = "dark" | "light";

export type ToastVariant = "default" | "success" | "error";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface AppState {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  view: View;
  theme: Theme;
  paletteOpen: boolean;
  toasts: Toast[];

  setProjects: (projects: ProjectSummary[]) => void;
  navigate: (view: View) => void;
  openProject: (id: string, path: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  view: { kind: "dashboard" },
  theme: "dark",
  paletteOpen: false,
  toasts: [],

  setProjects: (projects) => set({ projects }),

  navigate: (view) =>
    set({
      view,
      selectedProjectId: view.kind === "project" ? view.id : null,
    }),

  openProject: (id, path) =>
    set({ view: { kind: "project", id, path }, selectedProjectId: id }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },

  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),

  pushToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-dismiss after 4s.
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}
