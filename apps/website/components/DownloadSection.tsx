import Link from "next/link";
import { Apple, MonitorDown, Terminal } from "lucide-react";
import { Reveal, Section } from "./Section";

const RELEASES_URL = "https://github.com/martin-k-m/orbit/releases/latest";

const platforms = [
  {
    name: "macOS",
    detail: "Universal · Apple Silicon & Intel",
    icon: Apple,
    href: RELEASES_URL,
    available: true,
  },
  {
    name: "Windows",
    detail: "Windows 10 & 11 · x64",
    icon: MonitorDown,
    href: RELEASES_URL,
    available: true,
  },
  {
    name: "Linux",
    detail: "AppImage & .deb · x64",
    icon: Terminal,
    href: RELEASES_URL,
    available: true,
  },
];

export function DownloadSection() {
  return (
    <Section id="download" className="py-20 sm:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 sm:p-14">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-64 w-[700px] -translate-x-1/2 rounded-full bg-brand-violet/15 blur-[100px]" />
            <div className="absolute inset-0 grid-bg opacity-40" />
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Download Orbit
            </h2>
            <p className="mt-4 text-pretty text-base text-slate-400 sm:text-lg">
              Free and open source. No account required. Under 20 MB, powered by a
              native Rust core.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {platforms.map((p) => {
              const Icon = p.icon;
              const inner = (
                <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-6 text-center transition-colors hover:border-white/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/20 to-brand-violet/10 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-white">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.detail}</div>
                  <span
                    className={
                      p.available
                        ? "mt-1 text-xs font-semibold text-brand-violet"
                        : "mt-1 text-xs font-medium text-slate-600"
                    }
                  >
                    {p.available ? "Download →" : "Coming soon"}
                  </span>
                </div>
              );
              return p.available ? (
                <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className="block h-full">
                  {inner}
                </a>
              ) : (
                <div key={p.name} className="h-full cursor-not-allowed opacity-60">
                  {inner}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-slate-500">
            <Link
              href="/download"
              className="text-brand-violet underline underline-offset-4 hover:text-white"
            >
              See all download options →
            </Link>
            <p>
              All builds are published to{" "}
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 underline underline-offset-4 hover:text-white"
              >
                GitHub Releases
              </a>
              . Prefer to build from source? See the docs.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
