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
  title: "CLI reference",
  description:
    "Reference for the orbit CLI: scan, info, health, deps, git, commands, run, and init.",
};

export default function CliPage() {
  return (
    <>
      <DocHeader
        eyebrow="Reference"
        title="CLI reference"
        intro="The orbit CLI exposes every core capability. Each command supports a --json flag for scripting and automation."
      />
      <Prose>
        <DocCallout type="tip" title="Global flags">
          Add <InlineCode>--json</InlineCode> to any command for machine-readable
          output, or <InlineCode>--help</InlineCode> for usage. Paths default to the
          current directory when omitted.
        </DocCallout>

        <DocHeading id="commands">Commands</DocHeading>
        <DocTable
          head={["Command", "Description"]}
          rows={[
            [<InlineCode key="s">orbit scan</InlineCode>, "Discover and index projects in a directory."],
            [<InlineCode key="i">orbit info</InlineCode>, "Show detailed information about a single project."],
            [<InlineCode key="h">orbit health</InlineCode>, "Run health checks across one or all projects."],
            [<InlineCode key="d">orbit deps</InlineCode>, "Inspect and audit dependencies."],
            [<InlineCode key="g">orbit git</InlineCode>, "Git status and bulk operations across repos."],
            [<InlineCode key="c">orbit commands</InlineCode>, "List commands defined in project profiles."],
            [<InlineCode key="r">orbit run</InlineCode>, "Run a named command from a project profile."],
            [<InlineCode key="n">orbit init</InlineCode>, "Generate a .project-orbit profile for a project."],
          ]}
        />

        <DocHeading id="scan">orbit scan</DocHeading>
        <DocP>
          Recursively discovers projects, detects each stack, and writes them to the
          local index.
        </DocP>
        <DocCode
          title="orbit scan"
          lines={[
            { text: "$ orbit scan ~/code", tone: "prompt" },
            { text: "  ✓ Discovered 12 projects in 240ms", tone: "success" },
            { text: "", tone: "muted" },
            { text: "$ orbit scan ~/code --json | jq '.projects | length'", tone: "prompt" },
            { text: "  12", tone: "muted" },
          ]}
        />

        <DocHeading id="info">orbit info</DocHeading>
        <DocP>Prints stack, branch, health score, and profile details for one project.</DocP>
        <DocCode
          title="orbit info"
          lines={[
            { text: "$ orbit info ~/code/orbit-core", tone: "prompt" },
            { text: "  orbit-core · Rust · main", tone: "default" },
            { text: "  Health 98 · 42 dependencies · clean tree", tone: "muted" },
          ]}
        />

        <DocHeading id="health">orbit health</DocHeading>
        <DocP>
          Runs the configured health checks. With no path, it evaluates the whole
          workspace.
        </DocP>
        <DocCode
          title="orbit health"
          lines={[
            { text: "$ orbit health", tone: "prompt" },
            { text: "  ✓ orbit-core     98", tone: "success" },
            { text: "  ! credda-api     84  (3 uncommitted changes)", tone: "warn" },
            { text: "  ✓ flux-engine    91", tone: "success" },
          ]}
        />

        <DocHeading id="deps">orbit deps</DocHeading>
        <DocP>Lists dependencies and flags outdated or vulnerable packages.</DocP>
        <DocCode
          title="orbit deps"
          lines={[
            { text: "$ orbit deps ~/code/credda-api --audit", tone: "prompt" },
            { text: "  42 dependencies · 2 outdated · 0 vulnerable", tone: "muted" },
          ]}
        />

        <DocHeading id="git">orbit git</DocHeading>
        <DocP>
          Reports git status across every repo, and can perform bulk operations like
          syncing or pulling.
        </DocP>
        <DocCode
          title="orbit git"
          lines={[
            { text: "$ orbit git status", tone: "prompt" },
            { text: "  2 repos with uncommitted changes", tone: "warn" },
            { text: "", tone: "muted" },
            { text: "$ orbit git sync", tone: "prompt" },
            { text: "  ✓ Pulled 12 repos · 0 conflicts", tone: "success" },
          ]}
        />

        <DocHeading id="cmds">orbit commands</DocHeading>
        <DocP>
          Lists every command declared in a project&apos;s{" "}
          <InlineCode>.project-orbit</InlineCode> profile.
        </DocP>
        <DocCode
          title="orbit commands"
          lines={[
            { text: "$ orbit commands ~/code/orbit-core", tone: "prompt" },
            { text: "  build · test · lint", tone: "muted" },
          ]}
        />

        <DocHeading id="run">orbit run</DocHeading>
        <DocP>Executes a named command from the project profile.</DocP>
        <DocCode
          title="orbit run"
          lines={[
            { text: "$ orbit run test ~/code/orbit-core", tone: "prompt" },
            { text: "  → cargo test --all", tone: "accent" },
            { text: "  ✓ 128 passed", tone: "success" },
          ]}
        />

        <DocHeading id="init">orbit init</DocHeading>
        <DocP>
          Detects the stack and scaffolds a <InlineCode>.project-orbit</InlineCode>{" "}
          profile with sensible defaults.
        </DocP>
        <DocCode
          title="orbit init"
          lines={[
            { text: "$ orbit init", tone: "prompt" },
            { text: "  ✓ Detected stack: rust", tone: "success" },
            { text: "  ✓ Wrote .project-orbit", tone: "success" },
          ]}
          caption="Learn the profile format on the Project profiles page."
        />
      </Prose>
      <PrevNext current="/docs/cli" />
    </>
  );
}
