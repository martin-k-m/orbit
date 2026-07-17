import { Reveal, Section, SectionHeading } from "./Section";

const trustItems = ["Local-first", "No account", "Open source", "Rust-powered"];

export function TrustStrip() {
  return (
    <Section className="py-8">
      <Reveal>
        <div className="glass flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl px-6 py-5 text-sm">
          {trustItems.map((item, i) => (
            <div key={item} className="flex items-center gap-3">
              {i > 0 ? (
                <span className="hidden text-slate-700 sm:inline" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <span className="font-medium text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

const stacks = [
  { label: "Rust", ring: "ring-orange-400/30", dot: "bg-orange-400", text: "text-orange-200" },
  { label: "TypeScript", ring: "ring-sky-400/30", dot: "bg-sky-400", text: "text-sky-200" },
  { label: "Python", ring: "ring-yellow-300/30", dot: "bg-yellow-300", text: "text-yellow-100" },
  { label: "Go", ring: "ring-cyan-300/30", dot: "bg-cyan-300", text: "text-cyan-100" },
  { label: "Docker", ring: "ring-blue-400/30", dot: "bg-blue-400", text: "text-blue-200" },
];

export function StackStrip() {
  return (
    <Section id="stacks" className="py-16 sm:py-20">
      <SectionHeading
        eyebrow="Polyglot by default"
        title="Built for the whole stack"
        description="Orbit auto-detects the languages and tools in every project and adapts its commands, health checks, and analytics accordingly."
      />
      <Reveal className="mt-10">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {stacks.map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 ring-1 ring-inset ${s.ring}`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
