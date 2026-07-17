import type { Metadata } from "next";
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
  title: "Plugins & ecosystem",
  description:
    "The Orbit ecosystem: Blink, Killer, Flux, and Beacon — described as a roadmap preview.",
};

export default function PluginsPage() {
  return (
    <>
      <DocHeader
        eyebrow="Reference"
        title="Plugins & ecosystem"
        intro="Orbit is designed to be the center of a small constellation of focused, local-first developer tools. Each integrates through Orbit's plugin surface."
      />
      <Prose>
        <DocCallout type="warn" title="Preview / roadmap">
          The ecosystem integrations below are in active development and described
          here as a preview. APIs and availability may change. Follow the GitHub repo
          for progress.
        </DocCallout>

        <DocHeading id="tools">The constellation</DocHeading>
        <DocTable
          head={["Tool", "Focus", "Status"]}
          rows={[
            [<InlineCode key="b">Blink</InlineCode>, "Snippet and clipboard sync across projects.", "Preview"],
            [<InlineCode key="k">Killer</InlineCode>, "Process and port manager — find and stop what's blocking a port.", "Preview"],
            [<InlineCode key="f">Flux</InlineCode>, "Workflow automation — chain commands into reusable pipelines.", "Preview"],
            [<InlineCode key="be">Beacon</InlineCode>, "Local monitoring — watch services and surface health locally.", "Preview"],
          ]}
        />

        <DocHeading id="blink">Blink</DocHeading>
        <DocP>
          Blink keeps a searchable, local library of snippets and clipboard history
          scoped to your projects. When integrated, Orbit&apos;s command palette can
          insert Blink snippets directly.
        </DocP>

        <DocHeading id="killer">Killer</DocHeading>
        <DocP>
          Killer surfaces the processes bound to any port and lets you stop them from
          the palette — no more hunting for a stray dev server holding{" "}
          <InlineCode>3000</InlineCode>.
        </DocP>

        <DocHeading id="flux">Flux</DocHeading>
        <DocP>
          Flux turns the named commands in your <InlineCode>.project-orbit</InlineCode>{" "}
          profiles into automated pipelines — run a build, test, and deploy sequence
          as a single Orbit action.
        </DocP>

        <DocHeading id="beacon">Beacon</DocHeading>
        <DocP>
          Beacon adds lightweight local monitoring: watch a set of services and see
          their status alongside your project health in the Orbit dashboard.
        </DocP>

        <DocHeading id="principles">Shared principles</DocHeading>
        <DocP>
          Every tool in the ecosystem follows the same rules as Orbit itself:
          local-first, no telemetry, and scriptable. Integrations communicate on-device
          — nothing is sent to a server.
        </DocP>

        <DocCallout type="tip">
          Want to build an integration? The plugin API will be documented here as it
          stabilizes. Star the{" "}
          <a
            href="https://github.com/martin-k-m/orbit"
            target="_blank"
            rel="noreferrer"
            className="text-brand-violet underline underline-offset-4"
          >
            repository
          </a>{" "}
          to follow along.
        </DocCallout>
      </Prose>
      <PrevNext current="/docs/plugins" />
    </>
  );
}
