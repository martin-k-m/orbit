import { LANGUAGE_META, type Language } from "@/lib/types";
import { cn } from "@/lib/cn";

export function LanguageChip({
  language,
  className,
  showLabel = true,
}: {
  language: Language;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = LANGUAGE_META[language];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-fg-muted",
        className,
      )}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}66` }}
      />
      {showLabel && meta.label}
    </span>
  );
}
