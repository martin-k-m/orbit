import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Lightbulb } from "lucide-react";
import { getPrevNext } from "@/docs/_nav";
import { CodeWindow, type CodeLine } from "./CodeWindow";
import { cn } from "./cn";

export function DocHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
}) {
  return (
    <header className="mb-10 border-b border-white/[0.08] pb-8">
      {eyebrow ? (
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-violet/90">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      {intro ? (
        <p className="mt-4 text-lg leading-relaxed text-slate-400">{intro}</p>
      ) : null}
    </header>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-slate-300">{children}</div>;
}

export function DocHeading({
  id,
  children,
  level = 2,
}: {
  id?: string;
  children: React.ReactNode;
  level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag
      id={id}
      className={cn(
        "scroll-mt-24 font-semibold tracking-tight text-white",
        level === 2 ? "mt-6 text-xl" : "mt-4 text-lg",
      )}
    >
      {children}
    </Tag>
  );
}

export function DocP({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-slate-300">{children}</p>;
}

export function DocList({
  items,
  ordered = false,
}: {
  items: React.ReactNode[];
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "flex flex-col gap-2 pl-5 text-[15px] leading-relaxed text-slate-300",
        ordered ? "list-decimal" : "list-disc",
        "marker:text-brand-violet/70",
      )}
    >
      {items.map((it, i) => (
        <li key={i} className="pl-1">
          {it}
        </li>
      ))}
    </Tag>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.85em] text-brand-violet">
      {children}
    </code>
  );
}

export function DocCode({
  title,
  lines,
  caption,
}: {
  title?: string;
  lines: CodeLine[];
  caption?: string;
}) {
  return <CodeWindow title={title} lines={lines} caption={caption} className="my-2" />;
}

const calloutStyles = {
  info: {
    icon: Info,
    wrap: "border-sky-400/20 bg-sky-400/[0.06]",
    icon_c: "text-sky-300",
  },
  tip: {
    icon: Lightbulb,
    wrap: "border-emerald-400/20 bg-emerald-400/[0.06]",
    icon_c: "text-emerald-300",
  },
  warn: {
    icon: AlertTriangle,
    wrap: "border-amber-400/20 bg-amber-400/[0.06]",
    icon_c: "text-amber-300",
  },
} as const;

export function DocCallout({
  type = "info",
  title,
  children,
}: {
  type?: keyof typeof calloutStyles;
  title?: string;
  children: React.ReactNode;
}) {
  const s = calloutStyles[type];
  const Icon = s.icon;
  return (
    <div className={cn("my-2 flex gap-3 rounded-xl border p-4", s.wrap)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon_c)} />
      <div className="text-sm leading-relaxed text-slate-300">
        {title ? <div className="mb-1 font-semibold text-white">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}

export function DocTable({
  head,
  rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="my-2 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.02]">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold text-slate-200">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.05] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top text-slate-400">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PrevNext({ current }: { current: string }) {
  const { prev, next } = getPrevNext(current);
  return (
    <nav className="mt-14 grid grid-cols-1 gap-4 border-t border-white/[0.08] pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-white/20"
        >
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowLeft className="h-3.5 w-3.5" /> Previous
          </span>
          <span className="text-sm font-medium text-slate-200 group-hover:text-white">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-right transition-colors hover:border-white/20"
        >
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            Next <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-medium text-slate-200 group-hover:text-white">
            {next.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
