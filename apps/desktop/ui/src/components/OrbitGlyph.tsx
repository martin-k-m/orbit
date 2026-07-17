import { cn } from "@/lib/cn";

/**
 * Orbit's mark: a glowing red core inside a tilted orbit ring with a travelling
 * electron, matched to the website's red-600 → rose-500 brand. Pass `spin` to
 * set the ring in slow motion (used on the splash and loading states).
 */
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
        <radialGradient id="orbit-core" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FDA4AF" />
          <stop offset="0.45" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#DC2626" />
        </radialGradient>
        <linearGradient id="orbit-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DC2626" />
          <stop offset="1" stopColor="#FB7185" />
        </linearGradient>
        <filter id="orbit-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Soft halo behind the core. */}
      <circle
        cx="16"
        cy="16"
        r="6"
        fill="#F43F5E"
        filter="url(#orbit-glow)"
        opacity="0.55"
      >
        <animate
          attributeName="opacity"
          values="0.35;0.7;0.35"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Orbit ring + travelling electron. */}
      <g className={spin ? "origin-center animate-spin-slow" : undefined}>
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="5.5"
          stroke="url(#orbit-ring)"
          strokeWidth="1.75"
          transform="rotate(-28 16 16)"
        />
        <circle cx="27.2" cy="10.4" r="2" fill="#FB7185" />
        <circle cx="27.2" cy="10.4" r="2" fill="#FB7185" opacity="0.5" filter="url(#orbit-glow)" />
      </g>

      {/* Glowing core. */}
      <circle cx="16" cy="16" r="5" fill="url(#orbit-core)" />
      <circle cx="16" cy="16" r="5" stroke="#FECACA" strokeOpacity="0.25" strokeWidth="0.75" />
    </svg>
  );
}
