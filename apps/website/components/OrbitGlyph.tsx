import { cn } from "./cn";

export function OrbitGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7", className)}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="orbit-glyph-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="4" fill="url(#orbit-glyph-grad)" />
      <ellipse
        cx="16"
        cy="16"
        rx="10.5"
        ry="4.6"
        stroke="url(#orbit-glyph-grad)"
        strokeWidth="1.6"
        transform="rotate(-28 16 16)"
      />
      <circle cx="25.2" cy="10.6" r="1.9" fill="#8B5CF6" />
    </svg>
  );
}
