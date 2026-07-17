import { create } from "zustand";
import { getSetting, setSetting, type AiMessage } from "@/lib/ipc";

/**
 * AI is **off by default and fully optional**. When on, Orbit talks to whatever
 * OpenAI-compatible endpoint the user points it at — a local runtime like Ollama
 * or LM Studio, or a hosted provider. Everything is stored locally; no key or
 * message ever leaves the machine except to the endpoint the user configured.
 */
export interface AiConfig {
  enabled: boolean;
  /** OpenAI-compatible base URL, e.g. `http://localhost:11434/v1`. */
  baseUrl: string;
  model: string;
  /** Optional bearer token; local servers usually need none. */
  apiKey: string;
}

/** Ollama's OpenAI-compatible endpoint — the local-first default. */
export const AI_DEFAULTS: AiConfig = {
  enabled: false,
  baseUrl: "http://localhost:11434/v1",
  model: "llama3.2",
  apiKey: "",
};

interface AiState extends AiConfig {
  /** The current conversation (in-memory; survives dock toggles, not restarts). */
  messages: AiMessage[];
  /** A request is in flight. */
  sending: boolean;

  setEnabled: (b: boolean) => void;
  setBaseUrl: (s: string) => void;
  setModel: (s: string) => void;
  setApiKey: (s: string) => void;

  pushMessage: (m: AiMessage) => void;
  setSending: (b: boolean) => void;
  clearConversation: () => void;
}

/** Best-effort persist — a failed settings write must never break the UI. */
function persist(key: string, value: string) {
  void setSetting(key, value).catch(() => {});
}

export const useAiStore = create<AiState>((set) => ({
  ...AI_DEFAULTS,
  messages: [],
  sending: false,

  setEnabled: (enabled) => {
    set({ enabled });
    persist("ai.enabled", enabled ? "1" : "0");
  },
  setBaseUrl: (baseUrl) => {
    set({ baseUrl });
    persist("ai.baseUrl", baseUrl);
  },
  setModel: (model) => {
    set({ model });
    persist("ai.model", model);
  },
  setApiKey: (apiKey) => {
    set({ apiKey });
    persist("ai.apiKey", apiKey);
  },

  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setSending: (sending) => set({ sending }),
  clearConversation: () => set({ messages: [] }),
}));

/** The configured provider, in the shape the `aiChat` IPC binding expects. */
export function providerFrom(c: AiConfig) {
  return {
    baseUrl: c.baseUrl.trim(),
    model: c.model.trim(),
    apiKey: c.apiKey.trim() || undefined,
  };
}

/** Load persisted AI config into the store on boot (called from App). */
export async function loadAiConfig(): Promise<void> {
  const [enabled, baseUrl, model, apiKey] = await Promise.all([
    getSetting("ai.enabled"),
    getSetting("ai.baseUrl"),
    getSetting("ai.model"),
    getSetting("ai.apiKey"),
  ]);
  const patch: Partial<AiConfig> = {};
  if (enabled === "1" || enabled === "0") patch.enabled = enabled === "1";
  if (baseUrl) patch.baseUrl = baseUrl;
  if (model) patch.model = model;
  if (apiKey != null) patch.apiKey = apiKey;
  if (Object.keys(patch).length > 0) useAiStore.setState(patch);
}
