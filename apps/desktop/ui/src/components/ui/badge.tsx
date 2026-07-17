import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "accent" | "success" | "warning" | "danger" | "outline";

const variantClasses: Record<Variant, string> = {
  default: "bg-white/[0.06] text-fg-muted border-white/[0.08]",
  accent: "bg-accent/15 text-accent border-accent/25",
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/25",
  danger: "bg-danger/15 text-danger border-danger/25",
  outline: "bg-transparent text-fg-muted border-white/[0.12]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-none",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
