import {
  FolderGit2,
  BarChart3,
  Container,
  Database,
  Globe,
  Puzzle,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAppStore, type View } from "@/store/app";
import { OrbitGlyph } from "@/components/OrbitGlyph";
import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  icon: typeof FolderGit2;
  view: View;
  match: (v: View) => boolean;
}

/** Primary destinations, VS Code activity-bar style: icon-only with tooltips. */
const NAV: NavItem[] = [
  {
    label: "Projects",
    icon: FolderGit2,
    view: { kind: "dashboard" },
    match: (v) => v.kind === "dashboard" || v.kind === "project",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    view: { kind: "analytics" },
    match: (v) => v.kind === "analytics",
  },
  {
    label: "Containers",
    icon: Container,
    view: { kind: "docker" },
    match: (v) => v.kind === "docker",
  },
  {
    label: "Database",
    icon: Database,
    view: { kind: "database" },
    match: (v) => v.kind === "database",
  },
  {
    label: "APIs",
    icon: Globe,
    view: { kind: "apis" },
    match: (v) => v.kind === "apis",
  },
  {
    label: "Plugins",
    icon: Puzzle,
    view: { kind: "plugins" },
    match: (v) => v.kind === "plugins",
  },
];

const SETTINGS: NavItem = {
  label: "Settings",
  icon: SettingsIcon,
  view: { kind: "settings" },
  match: (v) => v.kind === "settings",
};

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const navigate = useAppStore((s) => s.navigate);

  return (
    <aside className="flex w-12 shrink-0 flex-col border-r border-border bg-elevated">
      {/* Home — a small, static mark (no banner, no spin). */}
      <button
        onClick={() => navigate({ kind: "dashboard" })}
        aria-label="Orbit — Projects"
        className="no-drag flex h-11 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
      >
        <OrbitGlyph className="h-5 w-5" />
      </button>

      <nav className="flex flex-1 flex-col">
        {NAV.map((item) => (
          <Rail
            key={item.label}
            item={item}
            active={item.match(view)}
            onClick={() => navigate(item.view)}
          />
        ))}
      </nav>

      <Rail
        item={SETTINGS}
        active={SETTINGS.match(view)}
        onClick={() => navigate(SETTINGS.view)}
      />
    </aside>
  );
}

function Rail({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Hint label={item.label} side="right">
      <button
        onClick={onClick}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "no-drag relative flex h-11 w-full items-center justify-center transition-colors",
          active ? "text-fg" : "text-fg-subtle hover:bg-white/[0.04] hover:text-fg",
        )}
      >
        {/* VS Code-style active bar on the rail's left edge. */}
        <span
          className={cn(
            "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-accent transition-opacity",
            active ? "opacity-100" : "opacity-0",
          )}
        />
        <Icon className="h-5 w-5" />
      </button>
    </Hint>
  );
}
