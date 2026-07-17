import { useState } from "react";
import { RefreshCw, Download, CheckCircle2, Loader2 } from "lucide-react";
import { checkForUpdate, installUpdate, type UpdateInfo } from "@/lib/updater";
import { isTauri } from "@/lib/ipc";
import { cn } from "@/lib/cn";

type Phase = "idle" | "checking" | "current" | "available" | "installing";

/**
 * An on-demand "check for updates" control for Settings. Orbit also checks
 * automatically on launch (see {@link ../components/UpdateBanner}); this lets the
 * user check whenever they like and install without relaunching manually.
 */
export function UpdateCheck() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const tauri = isTauri();

  async function check() {
    setPhase("checking");
    const info = await checkForUpdate();
    if (info) {
      setUpdate(info);
      setPhase("available");
    } else {
      setPhase("current");
    }
  }

  async function install() {
    setPhase("installing");
    setProgress(0);
    try {
      await installUpdate((f) => setProgress(f));
    } catch {
      setPhase("available");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-fg-muted">
            {phase === "available"
              ? `Orbit v${update?.version} is available`
              : phase === "current"
                ? "You're on the latest version"
                : "Check for a newer version of Orbit"}
          </p>
          {!tauri && (
            <p className="mt-0.5 text-xs text-fg-subtle">
              Automatic updates work in the desktop app.
            </p>
          )}
        </div>

        {phase === "available" ? (
          <button
            onClick={install}
            disabled={phase !== "available" && phase !== "installing"}
            className="no-drag inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/25"
          >
            <Download className="h-3.5 w-3.5" /> Install & restart
          </button>
        ) : phase === "installing" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progress > 0 ? `${Math.round(progress * 100)}%` : "Installing…"}
          </span>
        ) : (
          <button
            onClick={check}
            disabled={!tauri || phase === "checking"}
            className={cn(
              "no-drag inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm transition-colors",
              tauri
                ? "text-fg-muted hover:bg-white/[0.06] hover:text-fg"
                : "cursor-not-allowed text-fg-subtle",
            )}
          >
            {phase === "checking" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : phase === "current" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {phase === "checking"
              ? "Checking…"
              : phase === "current"
                ? "Up to date"
                : "Check for updates"}
          </button>
        )}
      </div>
    </div>
  );
}
