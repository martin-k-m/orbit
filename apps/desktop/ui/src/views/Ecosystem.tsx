import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  ShieldAlert,
  Workflow,
  Radio,
  ArrowRight,
  Check,
  Sparkles,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type { EcosystemLink } from "@/lib/types";
import { ECOSYSTEM_META } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

type Engine = EcosystemLink;

const ICONS: Record<Engine, typeof Zap> = {
  blink: Zap,
  killer: ShieldAlert,
  flux: Workflow,
  beacon: Radio,
};

const DESCRIPTIONS: Record<Engine, string> = {
  blink: "Accelerate incremental builds with intelligent caching and warm compilation.",
  killer: "Continuous security scanning — dependency CVEs, secrets, and unsafe patterns.",
  flux: "Compose automation workflows that react to build, test, and release events.",
  beacon: "Monitor local API routes, health checks, and runtime metrics in real time.",
};

export function Ecosystem() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Ecosystem
          </h1>
          <Badge variant="accent">
            <Sparkles className="h-3 w-3" /> Preview
          </Badge>
        </div>
        <p className="text-sm text-fg-muted">
          Orbit connects to the wider developer toolchain. Engines run locally —
          previews below use mock data until an engine is installed.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BlinkCard />
        <KillerCard />
        <FluxCard />
        <BeaconCard />
      </div>
    </div>
  );
}

function EngineShell({
  engine,
  children,
  action,
}: {
  engine: Engine;
  children: ReactNode;
  action: ReactNode;
}) {
  const meta = ECOSYSTEM_META[engine];
  const Icon = ICONS[engine];
  return (
    <Card className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-20 blur-3xl"
        style={{ background: meta.accent }}
      />
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-soft"
              style={{
                background: `linear-gradient(135deg, ${meta.accent}, ${meta.accent}99)`,
              }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>{meta.label}</CardTitle>
              <p className="text-xs text-fg-subtle">{meta.tagline}</p>
            </div>
          </div>
          <Badge variant="outline">Preview</Badge>
        </div>
        <p className="mt-3 text-sm text-fg-muted">{DESCRIPTIONS[engine]}</p>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-4">
        {children}
        <div className="pt-1">{action}</div>
      </CardContent>
    </Card>
  );
}

function BlinkCard() {
  const [ran, setRan] = useState(false);
  return (
    <EngineShell
      engine="blink"
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRan(true)}
          className="w-full"
        >
          <Zap className="h-3.5 w-3.5" /> Accelerate with Blink
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <BuildStat label="Before" value="18s" muted />
        <BuildStat
          label="After"
          value={ran ? "2s" : "—"}
          accent={ran}
        />
      </div>
      {ran && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-xs text-success"
        >
          <Check className="h-3.5 w-3.5" /> 9× faster — cache warmed, 214 units
          reused
        </motion.div>
      )}
    </EngineShell>
  );
}

function BuildStat({
  label,
  value,
  muted = false,
  accent = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          accent ? "text-success" : muted ? "text-fg-muted" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface Vuln {
  severity: "high" | "medium" | "low";
  pkg: string;
  detail: string;
}

const VULNS: Vuln[] = [
  { severity: "high", pkg: "openssl-sys", detail: "CVE-2024-XXXX in transitive dep" },
  { severity: "medium", pkg: "regex", detail: "ReDoS on untrusted input" },
  { severity: "low", pkg: "tempfile", detail: "Predictable file name" },
];

const SEV_STYLES: Record<Vuln["severity"], string> = {
  high: "text-danger",
  medium: "text-warning",
  low: "text-fg-muted",
};

function KillerCard() {
  const [scanned, setScanned] = useState(false);
  return (
    <EngineShell
      engine="killer"
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setScanned(true)}
          className="w-full"
        >
          <ShieldAlert className="h-3.5 w-3.5" /> Run security scan
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-3xl font-semibold text-fg">
            {scanned ? "82" : "—"}
            <span className="text-base text-fg-subtle">/100</span>
          </span>
          <span className="text-[11px] text-fg-subtle">Security score</span>
        </div>
        <div className="flex-1">
          <Progress value={scanned ? 82 : 0} indicatorClassName="bg-warning" />
        </div>
      </div>
      {scanned && (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-1.5"
        >
          {VULNS.map((v) => (
            <li
              key={v.pkg}
              className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs"
            >
              <AlertTriangle className={cn("h-3.5 w-3.5", SEV_STYLES[v.severity])} />
              <span className="font-mono text-fg">{v.pkg}</span>
              <span className="ml-auto truncate text-fg-subtle">{v.detail}</span>
            </li>
          ))}
        </motion.ul>
      )}
    </EngineShell>
  );
}

const WORKFLOW = ["On Build", "Run tests", "Security scan", "Release"];

function FluxCard() {
  return (
    <EngineShell
      engine="flux"
      action={
        <Button variant="secondary" size="sm" className="w-full" disabled>
          <Workflow className="h-3.5 w-3.5" /> Open workflow builder (coming soon)
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {WORKFLOW.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-fg">
              {step}
            </span>
            {i < WORKFLOW.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-fg-subtle">
        Drag-and-drop workflow editing arrives with the Flux engine.
      </p>
    </EngineShell>
  );
}

interface Route {
  method: string;
  path: string;
  status: "ok" | "warn";
  latency: string;
}

const ROUTES: Route[] = [
  { method: "GET", path: "/api/health", status: "ok", latency: "4ms" },
  { method: "GET", path: "/api/metrics", status: "ok", latency: "11ms" },
  { method: "POST", path: "/api/events", status: "warn", latency: "142ms" },
];

function BeaconCard() {
  return (
    <EngineShell
      engine="beacon"
      action={
        <Button variant="secondary" size="sm" className="w-full" disabled>
          <Radio className="h-3.5 w-3.5" /> Connect Beacon (coming soon)
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5">
        {ROUTES.map((r) => (
          <div
            key={r.path}
            className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs"
          >
            <span className="w-10 font-mono font-semibold text-fg-subtle">
              {r.method}
            </span>
            <span className="font-mono text-fg">{r.path}</span>
            <span className="ml-auto flex items-center gap-1.5 text-fg-subtle">
              <Activity
                className={cn(
                  "h-3 w-3",
                  r.status === "ok" ? "text-success" : "text-warning",
                )}
              />
              {r.latency}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-fg-subtle">
        Live localhost:3000 · mock health snapshot
      </p>
    </EngineShell>
  );
}
