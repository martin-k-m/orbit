import type { Metadata } from "next";
import {
  DocCallout,
  DocCode,
  DocHeader,
  DocHeading,
  DocList,
  DocP,
  InlineCode,
  Prose,
  PrevNext,
} from "@/components/DocComponents";

export const metadata: Metadata = {
  title: "Getting started",
  description: "Install Orbit and scan your first workspace in minutes.",
};

export default function GettingStartedPage() {
  return (
    <>
      <DocHeader
        eyebrow="Overview"
        title="Getting started"
        intro="Install Orbit, scan your workspace, and run your first command — all in a couple of minutes."
      />
      <Prose>
        <DocHeading id="install">1. Install Orbit</DocHeading>
        <DocP>
          Download the latest build for your platform from GitHub Releases, or install
          the CLI. Full platform-specific steps live on the{" "}
          <a href="/docs/installation" className="text-brand-violet underline underline-offset-4">
            Installation
          </a>{" "}
          page.
        </DocP>
        <DocCode
          title="install"
          lines={[
            { text: "# macOS (Homebrew)", tone: "comment" },
            { text: "$ brew install --cask orbit", tone: "prompt" },
            { text: "", tone: "muted" },
            { text: "# or download the app from GitHub Releases", tone: "comment" },
            { text: "# https://github.com/martin-k-m/orbit/releases/latest", tone: "muted" },
          ]}
        />

        <DocHeading id="scan">2. Scan your workspace</DocHeading>
        <DocP>
          Point Orbit at the directory where your code lives. It will recursively
          discover every project, detect its stack, and build a local index.
        </DocP>
        <DocCode
          title="orbit — scan"
          lines={[
            { text: "$ orbit scan ~/code", tone: "prompt" },
            { text: "  ✓ Discovered 12 projects in 240ms", tone: "success" },
            { text: "  9 healthy · 3 need attention · 0 offline", tone: "accent" },
          ]}
        />
        <DocCallout type="info">
          The scan is read-only and fully local. Orbit only writes an index to{" "}
          <InlineCode>~/.orbit/workspace.db</InlineCode>.
        </DocCallout>

        <DocHeading id="explore">3. Explore in the app</DocHeading>
        <DocP>
          Open the desktop app to see your workspace dashboard. From here you can:
        </DocP>
        <DocList
          items={[
            <>
              Press <InlineCode>⌘K</InlineCode> (or <InlineCode>Ctrl+K</InlineCode>) to
              open the command palette.
            </>,
            "Click any project to view its health, git status, and tasks.",
            "Run defined commands without leaving the keyboard.",
            "Review local analytics for commit trends and language usage.",
          ]}
        />

        <DocHeading id="profile">4. Add a project profile</DocHeading>
        <DocP>
          Teach Orbit your project&apos;s commands by dropping a{" "}
          <InlineCode>.project-orbit</InlineCode> file at its root. Generate a starter
          with <InlineCode>orbit init</InlineCode>.
        </DocP>
        <DocCode
          title="orbit — init"
          lines={[
            { text: "$ cd ~/code/my-app", tone: "prompt" },
            { text: "$ orbit init", tone: "prompt" },
            { text: "  ✓ Detected stack: typescript", tone: "success" },
            { text: "  ✓ Wrote .project-orbit", tone: "success" },
          ]}
          caption="See the Project profiles page for the full .project-orbit format."
        />

        <DocCallout type="tip" title="Next up">
          Learn the full command surface on the{" "}
          <a href="/docs/cli" className="text-brand-violet underline underline-offset-4">
            CLI reference
          </a>
          , or understand how Orbit is built on the{" "}
          <a href="/docs/architecture" className="text-brand-violet underline underline-offset-4">
            Architecture
          </a>{" "}
          page.
        </DocCallout>
      </Prose>
      <PrevNext current="/docs/getting-started" />
    </>
  );
}
