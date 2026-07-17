import { describe, it, expect, beforeEach } from "vitest";
import { useAiStore, providerFrom, AI_DEFAULTS } from "./ai";

const s = () => useAiStore.getState();

describe("ai store", () => {
  beforeEach(() => {
    useAiStore.setState({ ...AI_DEFAULTS, messages: [], sending: false });
  });

  it("is off by default and points at a local endpoint", () => {
    expect(s().enabled).toBe(false);
    expect(s().baseUrl).toContain("localhost");
    expect(s().messages).toEqual([]);
  });

  it("updates config fields", () => {
    s().setEnabled(true);
    s().setBaseUrl("https://api.openai.com/v1");
    s().setModel("gpt-4o-mini");
    s().setApiKey("sk-test");
    expect(s().enabled).toBe(true);
    expect(s().baseUrl).toBe("https://api.openai.com/v1");
    expect(s().model).toBe("gpt-4o-mini");
    expect(s().apiKey).toBe("sk-test");
  });

  it("accumulates and clears the conversation", () => {
    s().pushMessage({ role: "user", content: "hi" });
    s().pushMessage({ role: "assistant", content: "hello" });
    expect(s().messages).toHaveLength(2);
    s().clearConversation();
    expect(s().messages).toEqual([]);
  });

  it("builds a provider payload, trimming and dropping an empty key", () => {
    const p = providerFrom({
      enabled: true,
      baseUrl: "  http://localhost:11434/v1  ",
      model: "  llama3.2 ",
      apiKey: "   ",
    });
    expect(p.baseUrl).toBe("http://localhost:11434/v1");
    expect(p.model).toBe("llama3.2");
    expect(p.apiKey).toBeUndefined();
  });

  it("keeps a non-empty key in the provider payload", () => {
    const p = providerFrom({ ...AI_DEFAULTS, apiKey: " sk-abc " });
    expect(p.apiKey).toBe("sk-abc");
  });
});
