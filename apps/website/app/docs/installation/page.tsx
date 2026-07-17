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
  title: "Installation",
  description: "Install Orbit on macOS, Windows, and Linux, or build from source.",
};

export default function InstallationPage() {
  return (
    <>
      <DocHeader
        eyebrow="Overview"
        title="Installation"
        intro="Orbit ships prebuilt binaries for macOS and Windows, with Linux on the way. You can also build the whole toolchain from source."
      />
      <Prose>
        <DocHeading id="macos">macOS</DocHeading>
        <DocP>
          Orbit provides a universal build for both Apple Silicon and Intel Macs.
        </DocP>
        <DocCode
          title="macOS"
          lines={[
            { text: "# Homebrew (recommended)", tone: "comment" },
            { text: "$ brew install --cask orbit", tone: "prompt" },
            { text: "", tone: "muted" },
            { text: "# Or download Orbit.dmg from Releases and drag to /Applications", tone: "comment" },
          ]}
        />
        <DocCallout type="info">
          On first launch, right-click the app and choose <strong>Open</strong> to
          approve the developer signature in Gatekeeper.
        </DocCallout>

        <DocHeading id="windows">Windows</DocHeading>
        <DocP>Orbit supports Windows 10 and 11 (x64).</DocP>
        <DocCode
          title="Windows (PowerShell)"
          lines={[
            { text: "# winget", tone: "comment" },
            { text: "> winget install Orbit.Orbit", tone: "prompt" },
            { text: "", tone: "muted" },
            { text: "# Or run the Orbit-Setup.exe installer from Releases", tone: "comment" },
          ]}
        />

        <DocHeading id="linux">Linux</DocHeading>
        <DocCallout type="warn" title="Coming soon">
          Native Linux builds (AppImage and <InlineCode>.deb</InlineCode>) are in
          progress. In the meantime, build from source using the steps below.
        </DocCallout>

        <DocHeading id="cli">CLI only</DocHeading>
        <DocP>
          Prefer the terminal? Install just the <InlineCode>orbit</InlineCode> CLI via
          Cargo.
        </DocP>
        <DocCode
          title="cargo"
          lines={[
            { text: "$ cargo install orbit-cli", tone: "prompt" },
            { text: "$ orbit --version", tone: "prompt" },
            { text: "  orbit 0.4.0", tone: "muted" },
          ]}
        />

        <DocHeading id="from-source">Build from source</DocHeading>
        <DocP>You will need the following toolchain installed:</DocP>
        <DocList
          items={[
            <>
              <InlineCode>Rust</InlineCode> 1.77+ (via{" "}
              <a
                href="https://rustup.rs"
                target="_blank"
                rel="noreferrer"
                className="text-brand-violet underline underline-offset-4"
              >
                rustup
              </a>
              )
            </>,
            <>
              <InlineCode>Node.js</InlineCode> 20+ and a package manager (for the
              desktop frontend)
            </>,
            <>
              The <InlineCode>tauri-cli</InlineCode> (
              <InlineCode>cargo install tauri-cli</InlineCode>)
            </>,
          ]}
        />
        <DocCode
          title="build from source"
          lines={[
            { text: "$ git clone https://github.com/martin-k-m/orbit.git", tone: "prompt" },
            { text: "$ cd orbit", tone: "prompt" },
            { text: "", tone: "muted" },
            { text: "# Build the Rust core and CLI", tone: "comment" },
            { text: "$ cargo build --release", tone: "prompt" },
            { text: "", tone: "muted" },
            { text: "# Build and run the desktop app", tone: "comment" },
            { text: "$ cargo tauri build", tone: "prompt" },
            { text: "  ✓ Bundled Orbit for your platform", tone: "success" },
          ]}
        />

        <DocCallout type="tip">
          After installing, jump to{" "}
          <a href="/docs/getting-started" className="text-brand-violet underline underline-offset-4">
            Getting started
          </a>{" "}
          to scan your first workspace.
        </DocCallout>
      </Prose>
      <PrevNext current="/docs/installation" />
    </>
  );
}
