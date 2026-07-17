import { cn } from "@/lib/cn";

/** Inline indigo orbit ring with a glowing core dot. */
export function OrbitGlyph({
  className,
  spin = false,
}: {
  className?: string;
  spin?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-6 w-6", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="orbit-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818CF8" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="orbit-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <g className={spin ? "origin-center animate-spin-slow" : undefined}>
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="6"
          stroke="url(#orbit-ring)"
          strokeWidth="1.75"
          transform="rotate(-30 16 16)"
        />
        <circle cx="27" cy="10" r="1.75" fill="#A78BFA" />
      </g>
      <circle cx="16" cy="16" r="5" fill="url(#orbit-core)" />
      <circle cx="16" cy="16" r="5" fill="url(#orbit-core)" opacity="0.5">
        <animate
          attributeName="r"
          values="5;6.5;5"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
