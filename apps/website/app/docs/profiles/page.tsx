import type { Metadata } from "next";
import {
  DocCallout,
  DocCode,
  DocHeader,
  DocHeading,
  DocP,
  DocTable,
  InlineCode,
  Prose,
  PrevNext,
} from "@/components/DocComponents";

export const metadata: Metadata = {
  title: "Project profiles",
  description: "The .project-orbit TOML format for teaching Orbit your commands.",
};

export default function ProfilesPage() {
  return (
    <>
      <DocHeader
        eyebrow="Concepts"
        title="Project profiles"
        intro="A .project-orbit file is a small TOML profile at the root of a repository. It tells Orbit how to build, test, and health-check the project."
      />
      <Prose>
        <DocP>
          Profiles are optional — Orbit works without them by inferring commands from
          your project&apos;s stack. But a profile gives you full control and makes
          your commands available in the palette and CLI everywhere.
        </DocP>

        <DocHeading id="example">A complete example</DocHeading>
        <DocCode
          title=".project-orbit"
          lines={[
            { text: "# .project-orbit", tone: "comment" },
            { text: "[project]", tone: "accent" },
            { text: 'name = "orbit-core"', tone: "default" },
            { text: 'stack = "rust"', tone: "default" },
            { text: 'description = "Native core for the Orbit command center"', tone: "default" },
            { text: 'tags = ["engine", "library"]', tone: "default" },
            { text: "", tone: "muted" },
            { text: "[commands]", tone: "accent" },
            { text: 'build = "cargo build --release"', tone: "default" },
            { text: 'test  = "cargo test --all"', tone: "default" },
            { text: 'lint  = "cargo clippy -- -D warnings"', tone: "default" },
            { text: 'dev   = "cargo watch -x run"', tone: "default" },
            { text: "", tone: "muted" },
            { text: "[health]", tone: "accent" },
            { text: 'checks = ["build", "test", "lint"]', tone: "default" },
            { text: "audit_dependencies = true", tone: "default" },
            { text: "", tone: "muted" },
            { text: "[env]", tone: "accent" },
            { text: 'RUST_LOG = "info"', tone: "default" },
          ]}
        />

        <DocHeading id="sections">Sections</DocHeading>
        <DocTable
          head={["Section", "Key", "Description"]}
          rows={[
            [<InlineCode key="p">[project]</InlineCode>, <InlineCode key="n">name</InlineCode>, "Display name. Defaults to the folder name."],
            ["", <InlineCode key="s">stack</InlineCode>, "Primary stack: rust, typescript, python, go, docker, …"],
            ["", <InlineCode key="de">description</InlineCode>, "Short summary shown in the dashboard."],
            ["", <InlineCode key="t">tags</InlineCode>, "Optional labels for grouping and search."],
            [<InlineCode key="c">[commands]</InlineCode>, <InlineCode key="any">{'any = "…"'}</InlineCode>, "Named shell commands, runnable via orbit run <name>."],
            [<InlineCode key="h">[health]</InlineCode>, <InlineCode key="ch">checks</InlineCode>, "Command names to run for the health score."],
            ["", <InlineCode key="au">audit_dependencies</InlineCode>, "When true, include a dependency audit in health."],
            [<InlineCode key="e">[env]</InlineCode>, <InlineCode key="kv">{'KEY = "…"'}</InlineCode>, "Environment variables applied when running commands."],
          ]}
        />

        <DocCallout type="warn" title="Keep secrets out">
          The <InlineCode>[env]</InlineCode> section is for non-sensitive
          configuration only. Never commit real secrets to{" "}
          <InlineCode>.project-orbit</InlineCode> — use your existing secret manager.
        </DocCallout>

        <DocHeading id="generate">Generating a profile</DocHeading>
        <DocP>
          Run <InlineCode>orbit init</InlineCode> in any repository to scaffold a
          profile with commands inferred from the detected stack, then edit to taste.
        </DocP>
      </Prose>
      <PrevNext current="/docs/profiles" />
    </>
  );
}
