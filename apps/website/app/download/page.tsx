import type { Metadata } from "next";
import Link from "next/link";
import { Apple, MonitorDown, TerminalSquare, ShieldCheck, RefreshCw, Download } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Section, SectionHeading, Reveal } from "@/components/Section";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download Orbit for macOS (Apple Silicon & Intel), Windows and Linux. Free, open source, and local-first.",
};

const VERSION = "1.0.0";
const RELEASES_URL = "https://github.com/martin-k-m/orbit/releases/latest";
const ALL_RELEASES_URL = "https://github.com/martin-k-m/orbit/releases";

type Build = { label: string; sublabel: string };

type Platform = {
  name: string;
  requirement: string;
  icon: typeof Apple;
  builds: Build[];
};

const platforms: Platform[] = [
  {
    name: "macOS",
    requirement: "macOS 10.15 Catalina or newer",
    icon: Apple,
    builds: [
      { label: "Apple Silicon", sublabel: "M1 / M2 / M3 · .dmg" },
      { label: "Intel", sublabel: "x86-64 · .dmg" },
    ],
  },
  {
    name: "Windows",
    requirement: "Windows 10 & 11 · x64",
    icon: MonitorDown,
    builds: [
      { label: "Installer", sublabel: "MSI · recommended" },
      { label: "Setup", sublabel: "NSIS · .exe" },
    ],
  },
  {
    name: "Linux",
    requirement: "webkit2gtk 4.1 · x64",
    icon: TerminalSquare,
    builds: [
      { label: "AppImage", sublabel: "Portable · runs anywhere" },
      { label: "Debian", sublabel: "Ubuntu / Debian · .deb" },
    ],
  },
];

export default function DownloadPage() {
  return (
    <>
      <Nav />
      <main>
        <Section className="pt-20 sm:pt-28">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-brand-violet">
              Latest release · v{VERSION}
            </span>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Download Orbit
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
              Free and open source. No account, no telemetry — a native app under
              20&nbsp;MB, powered by a Rust core. Pick your platform below.
            </p>
          </div>
        </Section>

        <Section className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {platforms.map((p, idx) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.name} delay={idx * 0.05}>
                  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/20 to-brand-violet/10 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.requirement}</div>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col gap-2.5">
                      {p.builds.map((b) => (
                        <a
                          key={b.label}
                          href={RELEASES_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 transition-colors hover:border-brand-violet/40 hover:bg-white/[0.03]"
                        >
                          <Download className="h-4 w-4 text-brand-violet" />
                          <span className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{b.label}</span>
                            <span className="text-[11px] text-slate-500">{b.sublabel}</span>
                          </span>
                          <span className="ml-auto text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-violet">
                            →
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Each button opens the{" "}
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 underline underline-offset-4 hover:text-white"
            >
              latest release
            </a>
            , where every installer is published. Looking for an older version?{" "}
            <a
              href={ALL_RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 underline underline-offset-4 hover:text-white"
            >
              Browse all releases
            </a>
            .
          </p>
        </Section>

        <Section className="pb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: RefreshCw,
                title: "Automatic updates",
                body: "Orbit checks for signed updates on launch and installs them in place — no reinstalling.",
              },
              {
                icon: ShieldCheck,
                title: "Local-first & private",
                body: "No account, no telemetry. Your projects and analytics never leave your machine.",
              },
              {
                icon: TerminalSquare,
                title: "Prefer the terminal?",
                body: "Install the companion CLI with cargo install --path crates/orbit-cli.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
                >
                  <Icon className="h-5 w-5 text-brand-violet" />
                  <div className="mt-3 text-sm font-semibold text-white">{f.title}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{f.body}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section className="py-16 text-center">
          <SectionHeading
            eyebrow="Build from source"
            title="Or build it yourself"
            description="Orbit is fully open source. Clone the repo and build the app, CLI, and website from source in minutes."
          />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/docs/installation" className="btn-primary px-5 py-2.5">
              Installation guide
            </Link>
            <a
              href="https://github.com/martin-k-m/orbit"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/12 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              View on GitHub
            </a>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
