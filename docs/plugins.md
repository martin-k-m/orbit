# Plugins & integrations

Open **Plugins** from the activity bar. Today it does two things: it lists the
capabilities that ship in the box, and it shows the integrations you can
configure. A community plugin marketplace is on the [roadmap](../ROADMAP.md) —
it isn't built yet, and the Plugins view says so plainly rather than pretending.

## Built-in capabilities

Everything Orbit can do is presented here as a built-in "extension" — Source
Control, the integrated terminal, the AI assistant, language-server diagnostics,
testing, containers, database and APIs. These are always on; there's nothing to
install.

## Integrations

The **Integrations** section is where you connect Orbit to outside services.
The first is the **AI provider**:

- It shows whether an AI endpoint is **connected** (and which model/host), or
  **not configured**.
- **Configure** takes you to **Settings → AI**, where you point Orbit at any
  OpenAI-compatible endpoint — a local runtime (Ollama, LM Studio, a llama.cpp
  server) or a hosted provider. AI is **off by default**, and the endpoint,
  model and key are stored only on your device.

More integrations will land here over time.

## Plugin SDK (planned)

A versioned plugin SDK will let extensions contribute languages, themes, panels,
commands, AI providers, debuggers and more — installed, updated and toggled from
this view. It's designed but not implemented; follow the
[roadmap](../ROADMAP.md) for progress.
