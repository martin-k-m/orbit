import type { Metadata } from "next";
import Link from "next/link";
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
        intro="Orbit ships prebuilt installers for macOS, Windows and Linux. You can also build the whole toolchain from source."
      />
      <Prose>
        <DocP>
          Grab the latest installer for your platform from the{" "}
          <Link
            href="/download"
            className="text-brand-violet underline underline-offset-4"
          >
            download page
          </Link>{" "}
          or{" "}
          <a
            href="https://github.com/martin-k-m/orbit/releases/latest"
            target="_blank"
            rel="noreferrer"
            className="text-brand-violet underline underline-offset-4"
          >
            GitHub Releases
          </a>
          .
        </DocP>

        <DocHeading id="macos">macOS</DocHeading>
        <DocP>
          Download the <InlineCode>.dmg</InlineCode> for your chip — Apple Silicon
          or Intel — open it, and drag Orbit to Applications.
        </DocP>
        <DocCode
          title="macOS"
          lines={[
            { text: "# Download Orbit_<version>_aarch64.dmg (Apple Silicon)", tone: "comment" },
            { text: "# or Orbit_<version>_x64.dmg (Intel) from Releases", tone: "comment" },
            { text: "# then drag Orbit to /Applications", tone: "comment" },
            { text: "", tone: "muted" },
            { text: "# Homebrew cask — planned", tone: "muted" },
          ]}
        />
        <DocCallout type="info">
          On first launch, right-click the app and choose <strong>Open</strong> to
          approve the developer signature in Gatekeeper.
        </DocCallout>

        <DocHeading id="windows">Windows</DocHeading>
        <DocP>Orbit supports Windows 10 and 11 (x64).</DocP>
        <DocCode
          title="Windows"
          lines={[
            { text: "# Run the .msi installer from Releases (recommended),", tone: "comment" },
            { text: "# or the NSIS .exe. WebView2 installs automatically.", tone: "comment" },
            { text: "", tone: "muted" },
            { text: "# winget package — planned", tone: "muted" },
          ]}
        />
        <DocCallout type="info">
          On unsigned pre-1.0 builds SmartScreen may appear — choose{" "}
          <strong>More info → Run anyway</strong>.
        </DocCallout>

        <DocHeading id="linux">Linux</DocHeading>
        <DocP>
          Choose the format your distro prefers. Runtime deps:{" "}
          <InlineCode>webkit2gtk-4.1</InlineCode> and{" "}
          <InlineCode>libayatana-appindicator3</InlineCode>.
        </DocP>
        <DocCode
          title="Linux"
          lines={[
            { text: "# AppImage — portable, no install", tone: "comment" },
            { text: "$ chmod +x Orbit_*.AppImage && ./Orbit_*.AppImage", tone: "prompt" },
            { text: "", tone: "muted" },
            { text: "# Debian / Ubuntu", tone: "comment" },
            { text: "$ sudo apt install ./orbit_*.deb", tone: "prompt" },
          ]}
        />

        <DocHeading id="cli">CLI only</DocHeading>
        <DocP>
          Prefer the terminal? Install just the <InlineCode>orbit</InlineCode> CLI
          from a clone of the repo with Cargo.
        </DocP>
        <DocCode
          title="cargo"
          lines={[
            { text: "$ cargo install --path crates/orbit-cli", tone: "prompt" },
            { text: "$ orbit --version", tone: "prompt" },
            { text: "  orbit 1.0.0", tone: "muted" },
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
          <Link href="/docs/getting-started" className="text-brand-violet underline underline-offset-4">
            Getting started
          </Link>{" "}
          to scan your first workspace.
        </DocCallout>
      </Prose>
      <PrevNext current="/docs/installation" />
    </>
  );
}
