import { OrbitGlyph } from "@/components/OrbitGlyph";
import { cn } from "@/lib/cn";

/**
 * The launch splashscreen — a black-and-red curtain over the whole window while
 * Orbit boots (theme + projects). The parent flips `hidden` once ready and
 * unmounts on the fade-out, so the app is revealed behind it.
 */
export function Splash({ hidden, onHidden }: { hidden: boolean; onHidden?: () => void }) {
  return (
    <div
      onTransitionEnd={(e) => {
        if (hidden && e.propertyName === "opacity") onHidden?.();
      }}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ease-out",
        hidden ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{
        background:
          "radial-gradient(900px 520px at 50% 18%, rgba(220,38,38,0.18), transparent 62%)," +
          "radial-gradient(760px 520px at 50% 118%, rgba(244,63,94,0.14), transparent 60%)," +
          "#0a0708",
      }}
    >
      {/* Ambient blooms. */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-accent-2/20 blur-[130px]" />
      {/* Faint vignette to seat the mark. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
      />

      <div className="relative flex flex-col items-center animate-scale-in">
        <div className="relative animate-float">
          <div className="absolute -inset-10 rounded-full bg-accent/25 blur-3xl animate-breathe" />
          <OrbitGlyph
            spin
            className="relative h-28 w-28 drop-shadow-[0_0_35px_rgba(220,38,38,0.65)]"
          />
        </div>

        <h1 className="mt-10 text-5xl font-semibold tracking-tight text-gradient">
          Orbit
        </h1>
        <p className="mt-2.5 text-sm font-medium uppercase tracking-[0.35em] text-fg-subtle">
          Developer IDE
        </p>

        {/* Indeterminate loading bar. */}
        <div className="relative mt-10 h-[3px] w-48 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-accent-gradient animate-indeterminate" />
        </div>
      </div>

      <p className="absolute bottom-8 text-[11px] tracking-wide text-fg-subtle/70">
        Local-first · Private · Fast
      </p>
    </div>
  );
}
