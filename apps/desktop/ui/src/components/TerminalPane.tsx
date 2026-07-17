import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { TerminalSquare } from "lucide-react";
import {
  isTauri,
  onTerminalExit,
  onTerminalOutput,
  terminalClose,
  terminalOpen,
  terminalResize,
  terminalWrite,
} from "@/lib/ipc";
import { cn } from "@/lib/cn";

// xterm theme tuned to Orbit's palette so the terminal doesn't look bolted on.
const THEME = {
  background: "#0A0A0F",
  foreground: "#E4E4EC",
  cursor: "#F43F5E",
  cursorAccent: "#0A0A0F",
  selectionBackground: "#F43F5E44",
  black: "#0A0A0F",
  red: "#F43F5E",
  green: "#34D399",
  yellow: "#FBBF24",
  blue: "#60A5FA",
  magenta: "#C084FC",
  cyan: "#22D3EE",
  white: "#E4E4EC",
  brightBlack: "#4B4B5A",
  brightRed: "#FB7185",
  brightGreen: "#6EE7B7",
  brightYellow: "#FCD34D",
  brightBlue: "#93C5FD",
  brightMagenta: "#D8B4FE",
  brightCyan: "#67E8F9",
  brightWhite: "#FFFFFF",
};

/**
 * A live shell for a project, backed by a real PTY.
 *
 * Owns one session for its lifetime: opens on mount, streams output in, sends
 * keystrokes out, keeps the shell's idea of the viewport in sync with the DOM,
 * and kills the session on unmount so we never leak a shell.
 */
export function TerminalPane({
  path,
  shell,
  className,
}: {
  path: string;
  shell?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const sessionRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"starting" | "live" | "exited" | "error">(
    "starting",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const term = new XTerm({
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: 13,
      lineHeight: 1.35,
      cursorBlink: true,
      theme: THEME,
      // Generous scrollback: build output is long and people scroll back.
      scrollback: 10_000,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();
    xtermRef.current = term;

    (async () => {
      // Subscribe before opening, or the shell's first prompt can race us.
      unlisteners.push(
        await onTerminalOutput(({ id, data }) => {
          if (id === sessionRef.current) term.write(data);
        }),
      );
      unlisteners.push(
        await onTerminalExit(({ id }) => {
          if (id !== sessionRef.current) return;
          setStatus("exited");
          term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n");
        }),
      );

      if (!isTauri()) {
        // Browser demo: no PTY available, so explain rather than hang.
        term.write(
          "\x1b[2mOrbit demo — terminals need the desktop app.\x1b[0m\r\n\r\n",
        );
        term.write(`\x1b[38;5;204m➜\x1b[0m  ${path.split(/[/\\]/).pop()} `);
        setStatus("live");
        return;
      }

      try {
        const id = await terminalOpen(path, shell, term.cols, term.rows);
        if (disposed) {
          // Unmounted mid-open: don't leak the shell we just started.
          await terminalClose(id);
          return;
        }
        sessionRef.current = id;
        setStatus("live");
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    // Keystrokes -> PTY.
    const dataSub = term.onData((data) => {
      const id = sessionRef.current;
      if (id) void terminalWrite(id, data);
    });

    // Keep the shell's viewport in step with ours so output reflows correctly.
    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // The host can be measured at zero size mid-layout; ignore.
        return;
      }
      const id = sessionRef.current;
      if (id) void terminalResize(id, term.cols, term.rows);
    });
    observer.observe(host);

    return () => {
      disposed = true;
      observer.disconnect();
      dataSub.dispose();
      unlisteners.forEach((un) => un());
      const id = sessionRef.current;
      if (id) void terminalClose(id);
      term.dispose();
      xtermRef.current = null;
      sessionRef.current = null;
    };
  }, [path, shell]);

  return (
    <div
      className={cn(
        "relative flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0A0A0F]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <TerminalSquare className="h-3.5 w-3.5 text-fg-muted" />
        <span className="text-xs text-fg-muted">
          {path.split(/[/\\]/).pop()}
        </span>
        <span
          className={cn(
            "ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium",
            status === "live" && "bg-emerald-500/10 text-emerald-400",
            status === "starting" && "bg-white/[0.06] text-fg-muted",
            status === "exited" && "bg-white/[0.06] text-fg-muted",
            status === "error" && "bg-danger/10 text-danger",
          )}
        >
          {status}
        </span>
      </div>

      {error ? (
        <div className="p-3 text-xs text-danger">{error}</div>
      ) : null}

      {/* xterm measures its host, so it needs a real box to fill. */}
      <div ref={hostRef} className="min-h-0 flex-1 p-2" />
    </div>
  );
}
