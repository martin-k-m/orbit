import type { Metadata } from "next";
import {
  DocCallout,
  DocCode,
  DocHeader,
  DocHeading,
  DocList,
  DocP,
  DocTable,
  InlineCode,
  Prose,
  PrevNext,
} from "@/components/DocComponents";

export const metadata: Metadata = {
  title: "Configuration",
  description:
    "Configure Orbit with per-project .project-orbit profiles and local app settings.",
};

export default function ConfigurationPage() {
  return (
    <>
      <DocHeader
        eyebrow="Concepts"
        title="Configuration"
        intro="Orbit is configured in two places: per-project profiles you commit to your repo, and per-machine app settings stored locally."
      />
      <Prose>
        <DocHeading id="profiles">Project profiles — .project-orbit</DocHeading>
        <DocP>
          A profile is a small TOML file at the root of a project. It lets you
          override the project&apos;s display name and pin the exact commands Orbit
          should run, regardless of what the detector guessed. Generate one with{" "}
          <InlineCode>orbit init</InlineCode> or the &ldquo;Generate profile&rdquo;
          action in the app.
        </DocP>
        <DocCode
          title=".project-orbit"
          lines={[
            { text: "[project]", tone: "key" },
            { text: 'name = "Blink"', tone: "string" },
            { text: 'description = "Developer acceleration toolkit"', tone: "string" },
            { text: "", tone: "muted" },
            { text: "[commands]", tone: "key" },
            { text: 'dev   = "cargo run"', tone: "default" },
            { text: 'test  = "cargo test"', tone: "default" },
            { text: 'build = "cargo build --release"', tone: "default" },
            { text: 'lint  = "cargo clippy -- -D warnings"', tone: "default" },
          ]}
        />
        <DocList
          items={[
            <>
              <InlineCode>[project].name</InlineCode> — display name in Orbit
              (defaults to the folder name).
            </>,
            <>
              <InlineCode>[project].description</InlineCode> — a one-line
              description shown on the project card.
            </>,
            <>
              <InlineCode>[commands]</InlineCode> — a table of{" "}
              <InlineCode>name = &quot;program args…&quot;</InlineCode>. The first token
              is the program, the rest are arguments. Profile commands override
              detected commands with the same name.
            </>,
          ]}
        />
        <DocCallout type="tip">
          Commit <InlineCode>.project-orbit</InlineCode> to share the setup with
          your team — everyone&apos;s Orbit then runs the same commands.
        </DocCallout>

        <DocHeading id="detection">What Orbit detects automatically</DocHeading>
        <DocP>
          Without a profile, Orbit infers commands from each ecosystem&apos;s
          manifest:
        </DocP>
        <DocTable
          head={["Ecosystem", "Detected from", "Example commands"]}
          rows={[
            ["Rust", <InlineCode key="c">Cargo.toml</InlineCode>, "cargo run · cargo test · cargo build --release"],
            ["Node / TS", <InlineCode key="p">package.json</InlineCode>, "every script, plus dev / build / test"],
            ["Python", "pyproject.toml / requirements.txt", "pytest · ruff check · install"],
            ["Go", <InlineCode key="g">go.mod</InlineCode>, "go run . · go test ./... · go build ./..."],
            ["Docker", "docker-compose.yml", "docker compose up / down / logs"],
          ]}
        />
        <DocP>
          The package manager for Node projects is chosen from the lockfile:{" "}
          <InlineCode>pnpm-lock.yaml</InlineCode> → pnpm,{" "}
          <InlineCode>yarn.lock</InlineCode> → yarn,{" "}
          <InlineCode>bun.lockb</InlineCode> → bun, otherwise npm.
        </DocP>

        <DocHeading id="app-data">App settings &amp; data</DocHeading>
        <DocP>
          Orbit stores its own state in a single SQLite database in the platform
          app-data directory:
        </DocP>
        <DocTable
          head={["OS", "Location"]}
          rows={[
            ["macOS", <InlineCode key="m">~/Library/Application Support/com.orbit.dev</InlineCode>],
            ["Windows", <InlineCode key="w">{"%APPDATA%\\com.orbit.dev"}</InlineCode>],
            ["Linux", <InlineCode key="l">~/.local/share/com.orbit.dev</InlineCode>],
          ]}
        />
        <DocP>
          It holds the projects you added, your settings, and the local analytics
          event log. It is never uploaded anywhere. Deleting the folder resets
          Orbit to a clean state; it does not touch your actual project folders.
        </DocP>

        <DocCallout type="info" title="Privacy">
          Orbit makes no network requests on its hot paths and has no telemetry.
          The only network feature is the optional update check against GitHub
          Releases.
        </DocCallout>
      </Prose>
      <PrevNext current="/docs/configuration" />
    </>
  );
}
