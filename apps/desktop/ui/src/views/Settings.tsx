import { useEffect, useMemo, useState } from "react";
import {
  Moon,
  Sun,
  MonitorCog,
  Contrast,
  FolderLock,
  ShieldCheck,
  HardDrive,
  Search,
  Minus,
  Plus,
} from "lucide-react";
import { useAppStore, type Theme } from "@/store/app";
import { useSettingsStore } from "@/store/settings";
import { appVersion, getSetting } from "@/lib/ipc";
import { OrbitGlyph } from "@/components/OrbitGlyph";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/cn";

export function Settings() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setTabSize = useSettingsStore((s) => s.setTabSize);
  const setWordWrap = useSettingsStore((s) => s.setWordWrap);
  const [version, setVersion] = useState("");
  const [dataLocation, setDataLocation] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    appVersion().then(setVersion);
    getSetting("data-location").then(setDataLocation);
  }, []);

  // Cards declare keywords so the search box can filter them.
  const q = query.trim().toLowerCase();
  const shows = useMemo(
    () => (keywords: string) => !q || keywords.toLowerCase().includes(q),
    [q],
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Settings</h1>
          <p className="text-sm text-fg-muted">
            Personalize Orbit. Everything stays on this device.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 px-3 sm:max-w-sm">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings…"
            className="h-9 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
        </div>
      </header>

      {shows("appearance theme dark light system look") && (
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Orbit looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-4">
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
            <ThemeOption
              active={theme === "high-contrast"}
              onClick={() => setTheme("high-contrast" as Theme)}
              icon={Contrast}
              label="Contrast"
            />
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            {theme === "system"
              ? "Following your operating system, and updating live when it changes."
              : theme === "high-contrast"
                ? "Maximum contrast for low-vision use."
                : "Your choice is remembered across restarts."}
          </p>
        </CardContent>
      </Card>
      )}

      {shows("editor font size tab word wrap code indentation") && (
      <Card>
        <CardHeader>
          <CardTitle>Editor</CardTitle>
          <CardDescription>Applies live to every open file.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-fg-muted">Font size</span>
            <div className="flex items-center gap-1">
              <Stepper label="Decrease font size" onClick={() => setFontSize(fontSize - 1)}>
                <Minus className="h-3.5 w-3.5" />
              </Stepper>
              <span className="w-12 text-center font-mono text-sm text-fg">{fontSize}px</span>
              <Stepper label="Increase font size" onClick={() => setFontSize(fontSize + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Stepper>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-fg-muted">Tab size</span>
            <div className="flex items-center gap-1">
              {[2, 4, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setTabSize(n)}
                  className={cn(
                    "no-drag h-8 w-9 rounded-lg text-sm font-medium transition-colors",
                    tabSize === n
                      ? "bg-accent/15 text-accent"
                      : "bg-white/[0.03] text-fg-muted hover:bg-white/[0.06]",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-fg-muted">Word wrap</span>
            <button
              role="switch"
              aria-checked={wordWrap}
              onClick={() => setWordWrap(!wordWrap)}
              className={cn(
                "no-drag relative h-6 w-11 rounded-full transition-colors",
                wordWrap ? "bg-accent" : "bg-white/[0.12]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  wordWrap ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>
      )}

      {shows("data privacy telemetry storage location") && (
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
      )}

      {shows("about version orbit") && (
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <OrbitGlyph className="h-12 w-12" />
            <div>
              <p className="text-base font-semibold text-fg">Orbit</p>
              <p className="text-sm text-fg-muted">Developer IDE</p>
              <p className="mt-1 font-mono text-xs text-fg-subtle">
                {version ? `v${version}` : "loading…"} · Tauri 2 · React 18
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

function Stepper({
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
      onClick={onClick}
      aria-label={label}
      className="no-drag flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
    >
      {children}
    </button>
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
