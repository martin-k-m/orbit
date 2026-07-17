import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, Trash2, Settings as SettingsIcon, User } from "lucide-react";
import { aiChat, type AiMessage } from "@/lib/ipc";
import { useAiStore, providerFrom } from "@/store/ai";
import { useAppStore } from "@/store/app";
import { useEditorStore, activeTab } from "@/store/editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** The host of a base URL, for a compact provider label (falls back to raw). */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * A project-aware AI chat, docked as a tool window. Local-first: it only talks
 * to the endpoint the user configured in Settings → AI (a local Ollama/LM Studio
 * server by default), and stays entirely off until they turn it on.
 */
export function AiChatPanel({ projectName }: { projectName: string }) {
  const enabled = useAiStore((s) => s.enabled);
  const baseUrl = useAiStore((s) => s.baseUrl);
  const model = useAiStore((s) => s.model);
  const apiKey = useAiStore((s) => s.apiKey);
  const messages = useAiStore((s) => s.messages);
  const sending = useAiStore((s) => s.sending);
  const pushMessage = useAiStore((s) => s.pushMessage);
  const setSending = useAiStore((s) => s.setSending);
  const clearConversation = useAiStore((s) => s.clearConversation);

  const navigate = useAppStore((s) => s.navigate);
  const active = useEditorStore(activeTab);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  if (!enabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-panel p-8 text-center">
        <Bot className="h-8 w-8 text-fg-subtle" />
        <div>
          <p className="text-sm font-medium text-fg">AI is off</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-fg-subtle">
            Orbit's assistant is fully optional and local-first. Point it at a
            local model (Ollama, LM Studio) or a hosted endpoint to turn it on —
            nothing is sent anywhere until you do.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate({ kind: "settings" })}>
          <SettingsIcon className="h-3.5 w-3.5" /> Configure in Settings
        </Button>
      </div>
    );
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    const userMsg: AiMessage = { role: "user", content: text };
    // A fresh system prompt each turn carries the current project context; it is
    // sent but never stored in the visible transcript.
    const system: AiMessage = {
      role: "system",
      content:
        `You are an AI assistant embedded in the Orbit IDE, helping with the project "${projectName}".` +
        (active ? ` The developer is currently viewing the file "${active.name}".` : "") +
        " Be concise and practical, and prefer concrete code over prose.",
    };
    const history = useAiStore.getState().messages;

    setDraft("");
    pushMessage(userMsg);
    setSending(true);
    try {
      const reply = await aiChat(providerFrom({ enabled, baseUrl, model, apiKey }), [
        system,
        ...history,
        userMsg,
      ]);
      pushMessage({ role: "assistant", content: reply });
    } catch (e) {
      pushMessage({ role: "assistant", content: `⚠️ ${String(e)}` });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-panel">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <Bot className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-medium text-fg">AI</span>
        <span className="truncate font-mono text-[11px] text-fg-subtle">
          {model} · {hostOf(baseUrl)}
        </span>
        <button
          onClick={clearConversation}
          disabled={messages.length === 0}
          title="Clear conversation"
          className="no-drag ml-auto rounded p-1 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && !sending && (
          <p className="pt-6 text-center text-xs text-fg-subtle">
            Ask about {projectName} — architecture, a bug, a refactor, tests.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="flex gap-2.5">
            <div
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded",
                m.role === "user" ? "bg-white/[0.06] text-fg-muted" : "bg-accent/15 text-accent",
              )}
            >
              {m.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
            </div>
            <div className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-fg-muted">
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-fg-subtle">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-border p-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          spellCheck={false}
          placeholder={`Ask about ${projectName}…  (Enter to send, Shift+Enter for a newline)`}
          className="no-drag min-h-0 flex-1 resize-none rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-2 text-[13px] text-fg outline-none placeholder:text-fg-subtle focus:border-accent/40"
        />
        <Button size="sm" onClick={send} disabled={sending || !draft.trim()}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send
        </Button>
      </div>
    </div>
  );
}
