"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Apple, ArrowRight, Github, MonitorDown } from "lucide-react";
import { AppMockup } from "./AppMockup";
import { Section } from "./Section";

const RELEASES_URL = "https://github.com/martin-k-m/orbit/releases/latest";
const GITHUB_URL = "https://github.com/martin-k-m/orbit";

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: reduce ? undefined : { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: "easeOut" as const },
  });

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-bg mask-fade-b opacity-70" />
        <div className="absolute inset-x-0 top-[-10%] h-[600px] aurora" />
        <div className="absolute left-1/2 top-24 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand-violet/10 blur-[120px]" />
      </div>

      <Section className="pb-16 pt-16 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.a
            {...rise(0)}
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Open source · MIT licensed · Rust-powered
            <ArrowRight className="h-3 w-3" />
          </motion.a>

          <motion.h1
            {...rise(0.06)}
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl"
          >
            Your development workflow,{" "}
            <span className="text-gradient-brand">unified.</span>
          </motion.h1>

          <motion.p
            {...rise(0.12)}
            className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            Orbit is a local-first developer command center for managing projects,
            tools, and workflows — no server, no telemetry, everything on your
            machine.
          </motion.p>

          <motion.div
            {...rise(0.18)}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary w-full sm:w-auto">
              <Apple className="h-4 w-4" />
              Download for macOS
            </a>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-ghost w-full sm:w-auto">
              <MonitorDown className="h-4 w-4" />
              Download for Windows
            </a>
          </motion.div>

          <motion.a
            {...rise(0.24)}
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </motion.a>
        </div>

        {/* Mockup */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="relative mx-auto mt-14 max-w-5xl sm:mt-20"
        >
          <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-full bg-gradient-to-br from-brand-indigo/25 to-brand-violet/25 blur-[100px]" />
          <AppMockup className={reduce ? "" : "animate-float"} />
        </motion.div>
      </Section>
    </div>
  );
}
