import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-accent-gradient text-white shadow-soft hover:brightness-110 active:brightness-95",
  secondary:
    "bg-white/[0.06] text-fg hover:bg-white/[0.1] border border-white/[0.06]",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.05]",
  outline:
    "border border-white/[0.12] text-fg hover:bg-white/[0.05] hover:border-white/[0.2]",
  danger: "bg-danger/90 text-white hover:bg-danger",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-0",
        "disabled:pointer-events-none disabled:opacity-50 select-none no-drag",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
