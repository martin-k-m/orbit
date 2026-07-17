import type { Metadata } from "next";
import Link from "next/link";
import {
  DocCallout,
  DocHeader,
  DocHeading,
  DocP,
  DocTable,
  InlineCode,
  Prose,
  PrevNext,
} from "@/components/DocComponents";

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "How Orbit is built: orbit-core, orbit-desktop, orbit-cli, and orbit-web.",
};

export default function ArchitecturePage() {
  return (
    <>
      <DocHeader
        eyebrow="Concepts"
        title="Architecture"
        intro="Orbit is a small set of focused components sharing one Rust core. Everything is local-first, offline-capable, and built for speed."
      />
      <Prose>
        <DocHeading id="components">The four components</DocHeading>
        <DocTable
          head={["Component", "Language", "Role"]}
          rows={[
            [
              <InlineCode key="c">orbit-core</InlineCode>,
              "Rust",
              "The engine — project discovery, stack detection, git integration, health checks, and the local SQLite index.",
            ],
            [
              <InlineCode key="d">orbit-desktop</InlineCode>,
              "Rust + Tauri 2",
              "The native desktop shell. A thin, fast UI over orbit-core, with the command palette and dashboards.",
            ],
            [
              <InlineCode key="cl">orbit-cli</InlineCode>,
              "Rust",
              "The terminal interface. Every core capability, scriptable, with a --json output mode.",
            ],
            [
              <InlineCode key="w">orbit-web</InlineCode>,
              "Next.js",
              "This marketing site and documentation. Statically exported, no backend.",
            ],
          ]}
        />

        <DocHeading id="core">orbit-core</DocHeading>
        <DocP>
          The core is a pure Rust library with no UI dependencies. It handles
          filesystem scanning, language and tooling detection, git status via{" "}
          <InlineCode>libgit2</InlineCode>, dependency parsing, and the health-check
          engine. Results are cached in a local <InlineCode>SQLite</InlineCode>{" "}
          database at <InlineCode>~/.orbit/workspace.db</InlineCode> so repeat
          operations are instant.
        </DocP>

        <DocHeading id="desktop">orbit-desktop</DocHeading>
        <DocP>
          The desktop app is built with <InlineCode>Tauri 2</InlineCode>, which pairs a
          Rust backend with a system webview. Because the heavy lifting happens in
          <InlineCode> orbit-core</InlineCode>, the app stays small (under 20 MB) and
          responsive. The frontend communicates with the core over Tauri&apos;s typed
          command bridge — never over the network.
        </DocP>

        <DocHeading id="cli-comp">orbit-cli</DocHeading>
        <DocP>
          The CLI wraps the same core and is designed for automation. Every command
          accepts <InlineCode>--json</InlineCode>, making Orbit easy to pipe into
          scripts, CI, or other tools. See the{" "}
          <Link href="/docs/cli" className="text-brand-violet underline underline-offset-4">
            CLI reference
          </Link>
          .
        </DocP>

        <DocHeading id="data-flow">Data flow</DocHeading>
        <DocP>
          A scan walks the filesystem, detects each project&apos;s stack, reads any{" "}
          <InlineCode>.project-orbit</InlineCode> profile, and writes an index row per
          project. The desktop app and CLI both read from that same index, so they
          always agree. Nothing is ever transmitted off-device.
        </DocP>

        <DocCallout type="info" title="Why local-first?">
          Keeping the core on-device means Orbit works offline, respects your
          privacy, and stays fast — there is no round-trip to a server for any
          operation.
        </DocCallout>
      </Prose>
      <PrevNext current="/docs/architecture" />
    </>
  );
}
