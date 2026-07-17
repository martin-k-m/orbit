import { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  MonitorCog,
  FolderLock,
  ShieldCheck,
  HardDrive,
} from "lucide-react";
import { useAppStore, type Theme } from "@/store/app";
import { appVersion, getSetting } from "@/lib/ipc";
import { OrbitGlyph } from "@/components/OrbitGlyph";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/cn";

export function Settings() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [version, setVersion] = useState("");
  const [dataLocation, setDataLocation] = useState<string | null>(null);

  useEffect(() => {
    appVersion().then(setVersion);
    getSetting("data-location").then(setDataLocation);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Settings
        </h1>
        <p className="text-sm text-fg-muted">
          Personalize Orbit. Everything stays on this device.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Orbit looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
            <ThemeOption
              active={theme === "dark"}
              onClick={() => setTheme("dark" as Theme)}
              icon={Moon}
              label="Dark"
            />
            <ThemeOption
              active={theme === "light"}
              onClick={() => setTheme("light" as Theme)}
              icon={Sun}
              label="Light"
            />
            <ThemeOption
              active={theme === "system"}
              onClick={() => setTheme("system" as Theme)}
              icon={MonitorCog}
              label="System"
            />
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            {theme === "system"
              ? "Following your operating system, and updating live when it changes."
              : "Your choice is remembered across restarts."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & privacy</CardTitle>
          <CardDescription>
            Orbit is local-first. No account, no telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Row
            icon={HardDrive}
            label="Data location"
            value={dataLocation ?? "Application support directory"}
            mono
          />
          <Separator />
          <Row
            icon={ShieldCheck}
            label="Telemetry"
            value="Disabled — nothing leaves your machine"
          />
          <Separator />
          <Row
            icon={FolderLock}
            label="Storage"
            value="Local SQLite database"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <OrbitGlyph className="h-12 w-12" spin />
            <div>
              <p className="text-base font-semibold text-fg">Orbit</p>
              <p className="text-sm text-fg-muted">
                Developer command center
              </p>
              <p className="mt-1 font-mono text-xs text-fg-subtle">
                {version ? `v${version}` : "loading…"} · Tauri 2 · React 18
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ThemeOption({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Moon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
        active
          ? "border-accent/50 bg-accent/10 shadow-glow"
          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          active ? "bg-accent-gradient text-white" : "bg-white/[0.06] text-fg-muted",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium text-fg">{label}</span>
    </button>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof Moon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2.5 text-sm text-fg-muted">
        <Icon className="h-4 w-4 text-fg-subtle" />
        {label}
      </span>
      <span
        className={cn(
          "truncate text-sm text-fg-subtle",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}
