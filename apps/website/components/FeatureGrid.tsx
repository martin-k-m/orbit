import {
  Command,
  FolderKanban,
  LineChart,
  Lock,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Reveal, Section, SectionHeading } from "./Section";
import { cn } from "./cn";

const features = [
  {
    icon: FolderKanban,
    title: "Project Management",
    description:
      "Auto-discover every repo on your machine. Track branches, status, and health across your entire workspace at a glance.",
  },
  {
    icon: Command,
    title: "Command Center",
    description:
      "A ⌘K command palette for your whole stack. Run scripts, sync repos, and jump between projects without leaving the keyboard.",
  },
  {
    icon: LineChart,
    title: "Developer Analytics",
    description:
      "Local commit trends, language breakdowns, and dependency insights — computed on your machine, never uploaded anywhere.",
  },
  {
    icon: ShieldCheck,
    title: "Security Integration",
    description:
      "Surface vulnerable dependencies, stale secrets, and risky permissions with built-in scanners across every ecosystem.",
  },
  {
    icon: Workflow,
    title: "Automation",
    description:
      "Define reusable workflows in a simple .project-orbit file. Chain commands, health checks, and tasks per project.",
  },
  {
    icon: Lock,
    title: "Local-first Privacy",
    description:
      "No account, no server, no telemetry. Your code, metadata, and analytics never leave your device. Ever.",
  },
];

export function FeatureGrid() {
  return (
    <Section id="features" className="py-20 sm:py-28">
      <SectionHeading
        eyebrow="Features"
        title="One command center for everything you build"
        description="Orbit brings your projects, tools, and workflows into a single, fast, native interface — designed for developers who live in the terminal."
      />
      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.05}>
            <div
              className={cn(
                "group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/[0.16]",
              )}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-violet/10 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/20 to-brand-violet/10 text-brand-violet">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
