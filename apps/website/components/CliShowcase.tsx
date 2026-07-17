import { Reveal, Section, SectionHeading } from "./Section";
import { CodeWindow, type CodeLine } from "./CodeWindow";

const scanLines: CodeLine[] = [
  { text: "$ orbit scan ~/code", tone: "prompt" },
  { text: "", tone: "muted" },
  { text: "  Scanning ~/code for projects…", tone: "muted" },
  { text: "  ✓ Discovered 12 projects in 240ms", tone: "success" },
  { text: "", tone: "muted" },
  { text: "  PROJECT        STACK        BRANCH      HEALTH", tone: "muted" },
  { text: "  orbit-core     Rust         main        98  ●", tone: "default" },
  { text: "  credda-api     TypeScript   feat/auth   84  ●", tone: "default" },
  { text: "  flux-engine    Go           main        91  ●", tone: "default" },
  { text: "  beacon-ml      Python       dev         76  ●", tone: "default" },
  { text: "", tone: "muted" },
  { text: "  9 healthy · 3 need attention · 0 offline", tone: "accent" },
  { text: "  Wrote index to ~/.orbit/workspace.db", tone: "muted" },
];

const profileLines: CodeLine[] = [
  { text: "# .project-orbit", tone: "comment" },
  { text: "[project]", tone: "accent" },
  { text: 'name = "orbit-core"', tone: "default" },
  { text: 'stack = "rust"', tone: "default" },
  { text: 'description = "Native core for the Orbit command center"', tone: "default" },
  { text: "", tone: "muted" },
  { text: "[commands]", tone: "accent" },
  { text: 'build = "cargo build --release"', tone: "default" },
  { text: 'test  = "cargo test --all"', tone: "default" },
  { text: 'lint  = "cargo clippy -- -D warnings"', tone: "default" },
  { text: "", tone: "muted" },
  { text: "[health]", tone: "accent" },
  { text: "checks = [\"build\", \"test\", \"lint\"]", tone: "default" },
  { text: "audit_dependencies = true", tone: "default" },
];

export function CliShowcase() {
  return (
    <Section id="cli" className="py-20 sm:py-28">
      <SectionHeading
        eyebrow="Command line"
        title="A CLI that speaks your workflow"
        description="Everything in the app is scriptable. Scan your machine, inspect health, and define per-project profiles that Orbit understands everywhere."
      />
      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal>
          <CodeWindow
            title="orbit — scan"
            lines={scanLines}
            caption="orbit scan indexes every project locally — no network, no upload."
          />
        </Reveal>
        <Reveal delay={0.08}>
          <CodeWindow
            title=".project-orbit"
            lines={profileLines}
            caption="Drop a .project-orbit TOML file in any repo to teach Orbit its commands."
          />
        </Reveal>
      </div>
    </Section>
  );
}
