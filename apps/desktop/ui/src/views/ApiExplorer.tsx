import { useState } from "react";
import { Globe, Send, Plus, X, Loader2 } from "lucide-react";
import type { HttpResponse } from "@/lib/types";
import { httpRequest, isTauri } from "@/lib/ipc";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/cn";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
type Method = (typeof METHODS)[number];
const HAS_BODY: Method[] = ["POST", "PUT", "PATCH", "DELETE"];

/** A minimal REST client — send a request, inspect the response. Uses `curl`. */
export function ApiExplorer() {
  const pushToast = useAppStore((s) => s.pushToast);
  const [method, setMethod] = useState<Method>("GET");
  const [url, setUrl] = useState("https://api.github.com/zen");
  const [headers, setHeaders] = useState<[string, string][]>([["", ""]]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<HttpResponse | null>(null);

  async function send() {
    if (!url.trim()) return;
    setSending(true);
    try {
      const active = headers.filter(([n]) => n.trim());
      const res = await httpRequest(
        method,
        url.trim(),
        active,
        HAS_BODY.includes(method) && body ? body : undefined,
      );
      setResponse(res);
    } catch (e) {
      pushToast({ variant: "error", title: "Request failed", description: String(e) });
    } finally {
      setSending(false);
    }
  }

  function setHeader(i: number, which: 0 | 1, value: string) {
    setHeaders((hs) => {
      const next = hs.map((h) => [...h] as [string, string]);
      next[i][which] = value;
      // Keep a trailing empty row to type into.
      if (i === next.length - 1 && (next[i][0] || next[i][1])) next.push(["", ""]);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
          <Globe className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">APIs</h1>
          <p className="text-sm text-fg-subtle">Send a request and inspect the response.</p>
        </div>
      </header>

      {/* Request line */}
      <div className="flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className="no-drag rounded-lg border border-white/[0.1] bg-black/30 px-2 py-2 text-sm font-medium text-fg outline-none focus:border-accent/40"
        >
          {METHODS.map((m) => (
            <option key={m} value={m} className="bg-panel">
              {m}
            </option>
          ))}
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="https://api.example.com/…"
          className="no-drag min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent/40"
        />
        <button
          onClick={send}
          disabled={sending || !url.trim() || !isTauri()}
          className="no-drag inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Request */}
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Headers
            </h2>
            <div className="flex flex-col gap-1.5">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={h[0]}
                    onChange={(e) => setHeader(i, 0, e.target.value)}
                    placeholder="Header"
                    className="no-drag min-w-0 flex-1 rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 font-mono text-[12px] text-fg outline-none focus:border-accent/40"
                  />
                  <input
                    value={h[1]}
                    onChange={(e) => setHeader(i, 1, e.target.value)}
                    placeholder="Value"
                    className="no-drag min-w-0 flex-1 rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 font-mono text-[12px] text-fg outline-none focus:border-accent/40"
                  />
                  <button
                    onClick={() =>
                      setHeaders((hs) => (hs.length > 1 ? hs.filter((_, j) => j !== i) : hs))
                    }
                    className="no-drag rounded p-1 text-fg-subtle hover:bg-white/[0.06] hover:text-fg"
                    aria-label="Remove header"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setHeaders((hs) => [...hs, ["", ""]])}
                className="no-drag inline-flex w-fit items-center gap-1 text-[11px] text-fg-subtle hover:text-fg"
              >
                <Plus className="h-3 w-3" /> Add header
              </button>
            </div>
          </div>

          {HAS_BODY.includes(method) && (
            <div>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Body
              </h2>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                spellCheck={false}
                placeholder='{ "key": "value" }'
                className="no-drag w-full resize-none rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 font-mono text-[12px] text-fg outline-none focus:border-accent/40"
              />
            </div>
          )}
        </section>

        {/* Response */}
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            Response
          </h2>
          {response ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
                    statusTone(response.status),
                  )}
                >
                  {response.status || "ERR"} {response.statusText}
                </span>
                <span className="text-xs text-fg-subtle">{response.elapsedMs} ms</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
                <pre className="scrollbar-thin max-h-[420px] overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[12px] leading-relaxed text-fg-muted">
                  {prettyBody(response)}
                </pre>
              </div>
              {response.headers.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-fg-subtle">
                    {response.headers.length} response headers
                  </summary>
                  <div className="mt-1 flex flex-col gap-0.5 font-mono text-[11px] text-fg-subtle">
                    {response.headers.map((h, i) => (
                      <div key={i} className="truncate">
                        <span className="text-fg-muted">{h.name}</span>: {h.value}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-panel">
              <p className="text-sm text-fg-subtle">
                {isTauri() ? "Send a request to see the response." : "API preview — open the desktop app."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function prettyBody(res: HttpResponse): string {
  const ct = res.headers.find((h) => h.name.toLowerCase() === "content-type")?.value ?? "";
  if (ct.includes("json") || looksJson(res.body)) {
    try {
      return JSON.stringify(JSON.parse(res.body), null, 2);
    } catch {
      /* fall through to raw */
    }
  }
  return res.body || "(empty body)";
}

function looksJson(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") || t.startsWith("[");
}

function statusTone(status: number): string {
  if (status >= 200 && status < 300) return "bg-success/15 text-success";
  if (status >= 300 && status < 400) return "bg-accent/15 text-accent";
  if (status >= 400 && status < 500) return "bg-warning/15 text-warning";
  return "bg-danger/15 text-danger";
}
