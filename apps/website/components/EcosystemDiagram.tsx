"use client";

import { Radio, Sparkles, Wind, Zap } from "lucide-react";
import { OrbitGlyph } from "./OrbitGlyph";
import { Reveal, Section, SectionHeading } from "./Section";

const satellites = [
  {
    name: "Blink",
    tagline: "Snippet & clipboard sync",
    icon: Zap,
    pos: "left-1/2 top-0 -translate-x-1/2",
    color: "text-amber-300",
  },
  {
    name: "Flux",
    tagline: "Workflow automation",
    icon: Wind,
    pos: "right-0 top-1/2 -translate-y-1/2",
    color: "text-cyan-300",
  },
  {
    name: "Killer",
    tagline: "Process & port manager",
    icon: Sparkles,
    pos: "left-1/2 bottom-0 -translate-x-1/2",
    color: "text-rose-300",
  },
  {
    name: "Beacon",
    tagline: "Local monitoring",
    icon: Radio,
    pos: "left-0 top-1/2 -translate-y-1/2",
    color: "text-emerald-300",
  },
];

export function EcosystemDiagram() {
  return (
    <Section id="ecosystem" className="py-20 sm:py-28">
      <SectionHeading
        eyebrow="Ecosystem"
        title="Orbit is the center of gravity"
        description="Each Orbit tool is a focused, local-first app. Together they form one connected developer ecosystem — with Orbit orchestrating them all."
      />

      <Reveal className="mt-16">
        <div className="relative mx-auto aspect-square w-full max-w-lg">
          {/* Orbit rings */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[62%] w-[62%] rounded-full border border-white/[0.06]" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[92%] w-[92%] animate-spin-slow rounded-full border border-dashed border-white/[0.05]" />
          </div>

          {/* Connection lines */}
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <line x1="50%" y1="50%" x2="50%" y2="10%" stroke="url(#eco-line)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="90%" y2="50%" stroke="url(#eco-line)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="50%" y2="90%" stroke="url(#eco-line)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="10%" y2="50%" stroke="url(#eco-line)" strokeWidth="1" />
            <defs>
              <linearGradient id="eco-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#DC2626" stopOpacity="0.5" />
                <stop offset="1" stopColor="#F43F5E" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center: Orbit */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/15 bg-ink-850/90 shadow-2xl backdrop-blur">
              <div className="pointer-events-none absolute inset-0 rounded-full bg-brand-violet/20 blur-xl animate-pulse-glow" />
              <OrbitGlyph className="relative h-9 w-9" />
              <span className="relative mt-1 text-sm font-semibold text-white">Orbit</span>
            </div>
          </div>

          {/* Satellites */}
          {satellites.map((s) => (
            <div key={s.name} className={`absolute ${s.pos} z-10`}>
              <div className="flex w-32 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-ink-850/90 px-3 py-3 text-center shadow-xl backdrop-blur">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-[13px] font-semibold text-white">{s.name}</span>
                <span className="text-[10px] leading-tight text-slate-500">{s.tagline}</span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-slate-500">
          Ecosystem integrations are in active development. Follow along on GitHub
          as Blink, Flux, Killer, and Beacon come online.
        </p>
      </Reveal>
    </Section>
  );
}
