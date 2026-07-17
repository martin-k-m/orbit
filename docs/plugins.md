# Plugins & ecosystem integrations

Orbit is the hub of a family of local developer tools. It recognises sibling
projects and surfaces the right action for each. In v1.0 these integrations ship
as clearly-labelled **previews**: the UI and workflow are real, and they light
up fully when the corresponding engine is present on your machine.

```
                       Orbit
                         │
      ┌─────────┬────────┼────────┬─────────┐
    Blink     Flux     Killer   Beacon   (your project)
    build   automate  security   API
```

## How detection works

A project is linked to a sibling when Orbit recognises it — today by directory
name (`blink`, `killer`, `flux`, `beacon`). The project card then shows the
matching action.

## Blink — acceleration

*Accelerate with Blink* offers to speed up builds. The preview shows the
expected before/after (e.g. 18s → 2s). With the Blink engine installed, Orbit
delegates the build and reports real numbers.

## Killer — security

Right-click a project → *Security scan* runs Killer's scanner and shows a
security score, the vulnerabilities found and recommendations. Without the engine
present, a representative preview is shown.

## Flux — automation

*Automate with Flux* opens a workflow builder. Example workflow:

```
On Build:
  → Run tests
  → Run security scan
  → Create release
```

## Beacon — API monitoring

*Monitor with Beacon* watches a local API (e.g. `localhost:3000`) and surfaces
its routes, health and request activity.

## Roadmap

- Detect siblings by manifest metadata, not just folder name.
- A stable plugin manifest so third-party tools can register actions.
- Streaming output and live status for long-running integrations.

Integrations never send your code or data anywhere; they run locally, in keeping
with Orbit's local-first design.
