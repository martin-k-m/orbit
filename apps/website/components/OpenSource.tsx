import { GitFork, Github, Scale, Star } from "lucide-react";
import { Reveal, Section } from "./Section";

const GITHUB_URL = "https://github.com/martin-k-m/orbit";

export function OpenSource() {
  return (
    <Section id="open-source" className="py-20 sm:py-28">
      <Reveal>
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-brand-indigo/20 to-brand-violet/10 text-white">
            <Github className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Open source, by design
            </h2>
            <p className="mx-auto max-w-xl text-pretty text-base text-slate-400 sm:text-lg">
              Orbit is MIT licensed and built in the open. Audit the code, file
              issues, or send a pull request — and if it saves you time, drop a star.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-primary">
              <Star className="h-4 w-4" />
              Star on GitHub
            </a>
            <a
              href={`${GITHUB_URL}/fork`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <GitFork className="h-4 w-4" />
              Fork the repo
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" /> MIT License
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Rust core
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Tauri 2 desktop
            </span>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
