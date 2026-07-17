import type { Metadata } from "next";
import {
  DocCallout,
  DocCode,
  DocHeader,
  DocHeading,
  DocP,
  InlineCode,
  Prose,
  PrevNext,
} from "@/components/DocComponents";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: "Fixes for common issues when installing and running Orbit.",
};

export default function TroubleshootingPage() {
  return (
    <>
      <DocHeader
        eyebrow="Reference"
        title="Troubleshooting"
        intro="Common issues and how to resolve them. If none of these help, open an issue on GitHub."
      />
      <Prose>
        <DocHeading id="not-found">Orbit didn&apos;t find my project</DocHeading>
        <DocP>
          Orbit detects a project by its manifest at the folder root
          (<InlineCode>Cargo.toml</InlineCode>, <InlineCode>package.json</InlineCode>,{" "}
          <InlineCode>pyproject.toml</InlineCode>/<InlineCode>requirements.txt</InlineCode>,{" "}
          <InlineCode>go.mod</InlineCode>, <InlineCode>docker-compose.yml</InlineCode>).
          Check that the manifest is at the root, the project isn&apos;t inside an
          ignored directory (<InlineCode>node_modules</InlineCode>,{" "}
          <InlineCode>target</InlineCode>, <InlineCode>dist</InlineCode>,{" "}
          <InlineCode>.venv</InlineCode>…), and the folder still exists. Re-scan the
          parent folder to pick up changes.
        </DocP>

        <DocHeading id="git">Git status is missing</DocHeading>
        <DocP>
          Orbit reads git status by shelling out to the <InlineCode>git</InlineCode>{" "}
          binary — make sure it&apos;s installed and on your <InlineCode>PATH</InlineCode>.
          A folder that isn&apos;t a git repository simply shows no git section,
          which is expected.
        </DocP>

        <DocHeading id="blocked">A command won&apos;t run or is blocked</DocHeading>
        <DocP>
          Commands assessed as <strong>dangerous</strong> (<InlineCode>rm -rf</InlineCode>,{" "}
          <InlineCode>dd</InlineCode>, <InlineCode>mkfs</InlineCode>,{" "}
          <InlineCode>curl | sh</InlineCode>, force pushes…) require confirmation. In
          the app, confirm the dialog; in the CLI, pass <InlineCode>--yes</InlineCode>.
          If a command fails to start, check that its program is installed and on
          your <InlineCode>PATH</InlineCode>.
        </DocP>

        <DocHeading id="macos">The app won&apos;t open on macOS</DocHeading>
        <DocP>
          Pre-1.0 builds aren&apos;t notarized. Right-click <strong>Orbit</strong> →{" "}
          <strong>Open</strong> the first time to bypass Gatekeeper, or allow it
          under System Settings → Privacy &amp; Security.
        </DocP>

        <DocHeading id="windows">Windows SmartScreen warning</DocHeading>
        <DocP>
          Unsigned installers trigger SmartScreen. Choose{" "}
          <strong>More info → Run anyway</strong>. If the window is blank, ensure
          WebView2 is installed (the installer adds it automatically).
        </DocP>

        <DocHeading id="linux">Linux: blank window or won&apos;t start</DocHeading>
        <DocP>Install the runtime dependencies, then try disabling compositing:</DocP>
        <DocCode
          title="Ubuntu / Debian"
          lines={[
            { text: "$ sudo apt install libwebkit2gtk-4.1-0 libayatana-appindicator3-1", tone: "prompt" },
            { text: "", tone: "muted" },
            { text: "# If the window is blank:", tone: "comment" },
            { text: "$ WEBKIT_DISABLE_COMPOSITING_MODE=1 ./Orbit_*.AppImage", tone: "prompt" },
          ]}
        />

        <DocHeading id="reset">Resetting Orbit</DocHeading>
        <DocP>
          Orbit&apos;s state is a single SQLite database in the{" "}
          <InlineCode>com.orbit.dev</InlineCode> app-data directory. Delete that
          folder to reset the app to a clean state — your actual project folders
          are never touched.
        </DocP>

        <DocHeading id="sqlite">Build from source fails on bundled SQLite</DocHeading>
        <DocP>
          <InlineCode>orbit-core</InlineCode> builds SQLite from source, which needs
          a C toolchain. Install the MSVC C++ build tools on Windows, or{" "}
          <InlineCode>gcc</InlineCode>/<InlineCode>clang</InlineCode> on macOS/Linux.
        </DocP>

        <DocCallout type="info">
          Still stuck? Open an issue at{" "}
          <a
            href="https://github.com/martin-k-m/orbit/issues/new/choose"
            target="_blank"
            rel="noreferrer"
            className="text-brand-violet underline underline-offset-4"
          >
            github.com/martin-k-m/orbit/issues
          </a>
          .
        </DocCallout>
      </Prose>
      <PrevNext current="/docs/troubleshooting" />
    </>
  );
}
