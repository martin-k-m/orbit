import type { Metadata } from "next";
import {
  DocCallout,
  DocHeader,
  DocHeading,
  DocList,
  DocP,
  InlineCode,
  Prose,
  PrevNext,
} from "@/components/DocComponents";

export const metadata: Metadata = {
  title: "Introduction",
  description: "What is Orbit? A local-first developer command center.",
};

export default function DocsIntroPage() {
  return (
    <>
      <DocHeader
        eyebrow="Overview"
        title="What is Orbit?"
        intro="Orbit is a local-first developer command center — a fast, native desktop app that unifies the projects, tools, and workflows scattered across your machine into a single interface."
      />
      <Prose>
        <DocP>
          Modern development is fragmented. Your repositories live in a dozen
          folders, your scripts live in as many <InlineCode>package.json</InlineCode>{" "}
          and <InlineCode>Makefile</InlineCode> files, and your context lives in your
          head. Orbit brings all of it together: it scans your machine, understands
          each project&apos;s stack, and gives you one command center to manage them.
        </DocP>

        <DocHeading id="principles">Core principles</DocHeading>
        <DocList
          items={[
            <>
              <strong className="text-white">Local-first.</strong> Everything runs on
              your machine. There is no server, no account, and no cloud sync unless
              you build it yourself.
            </>,
            <>
              <strong className="text-white">Private by default.</strong> Orbit
              collects no telemetry. Your code, metadata, and analytics never leave
              your device.
            </>,
            <>
              <strong className="text-white">Fast and native.</strong> A Rust core
              paired with a Tauri 2 desktop shell keeps Orbit lightweight and
              responsive, even across hundreds of projects.
            </>,
            <>
              <strong className="text-white">Scriptable.</strong> Anything you can do
              in the app you can do from the <InlineCode>orbit</InlineCode> CLI, with a{" "}
              <InlineCode>--json</InlineCode> flag for automation.
            </>,
          ]}
        />

        <DocHeading id="what-you-get">What you get</DocHeading>
        <DocList
          items={[
            "Automatic project discovery across your entire workspace.",
            "A ⌘K command palette for running scripts and jumping between projects.",
            "Per-project health checks, git status, and dependency insights.",
            "Local developer analytics — commit trends and language breakdowns.",
            "A simple .project-orbit profile format to teach Orbit your commands.",
          ]}
        />

        <DocCallout type="tip" title="New to Orbit?">
          Head to{" "}
          <a
            href="/docs/getting-started"
            className="text-brand-violet underline underline-offset-4"
          >
            Getting started
          </a>{" "}
          to install the app and scan your first workspace in under two minutes.
        </DocCallout>

        <DocHeading id="how-it-fits">How Orbit fits together</DocHeading>
        <DocP>
          Orbit is split into four parts: <InlineCode>orbit-core</InlineCode> (the Rust
          engine), <InlineCode>orbit-desktop</InlineCode> (the Tauri app),{" "}
          <InlineCode>orbit-cli</InlineCode> (the terminal interface), and{" "}
          <InlineCode>orbit-web</InlineCode> (this site). See the{" "}
          <a
            href="/docs/architecture"
            className="text-brand-violet underline underline-offset-4"
          >
            Architecture
          </a>{" "}
          page for the full picture.
        </DocP>
      </Prose>
      <PrevNext current="/docs" />
    </>
  );
}
