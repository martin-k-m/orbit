import { cn } from "./cn";

export type CodeLine = {
  text: string;
  tone?:
    | "default"
    | "muted"
    | "prompt"
    | "success"
    | "accent"
    | "warn"
    | "key"
    | "string"
    | "comment";
};

const toneClass: Record<NonNullable<CodeLine["tone"]>, string> = {
  default: "text-slate-300",
  muted: "text-slate-500",
  prompt: "text-emerald-400",
  success: "text-emerald-400",
  accent: "text-brand-violet",
  warn: "text-amber-400",
  key: "text-sky-300",
  string: "text-emerald-300",
  comment: "text-slate-500 italic",
};

export function CodeWindow({
  title = "zsh",
  lines,
  className,
  showDots = true,
  caption,
}: {
  title?: string;
  lines: CodeLine[];
  className?: string;
  showDots?: boolean;
  caption?: string;
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-ink-900/90 shadow-2xl shadow-black/40 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
        {showDots ? (
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
        ) : null}
        <span className="font-mono text-xs text-slate-500">{title}</span>
      </div>
      <div className="overflow-x-auto p-4 sm:p-5">
        <pre className="font-mono text-[13px] leading-6">
          <code>
            {lines.map((line, i) => (
              <div key={i} className={cn("whitespace-pre", toneClass[line.tone ?? "default"])}>
                {line.text.length === 0 ? " " : line.text}
              </div>
            ))}
          </code>
        </pre>
      </div>
      {caption ? (
        <figcaption className="border-t border-white/[0.06] px-5 py-2.5 text-xs text-slate-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
