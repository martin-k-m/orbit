import {
  Puzzle,
  GitBranch,
  TerminalSquare,
  Container,
  Database,
  Globe,
  FlaskConical,
  Bot,
  Braces,
  Search,
  ExternalLink,
} from "lucide-react";

interface Capability {
  name: string;
  icon: typeof Puzzle;
  blurb: string;
}

/** The real, shipping capabilities — presented as built-in extensions. */
const BUILTINS: Capability[] = [
  { name: "Source Control", icon: GitBranch, blurb: "Stage, diff, commit, branches, stash, tags, and a commit graph." },
  { name: "Integrated Terminal", icon: TerminalSquare, blurb: "PTY-backed shells with tabs, splits, search and profiles." },
  { name: "AI Assistant", icon: Bot, blurb: "Local-first chat over any OpenAI-compatible endpoint." },
  { name: "Language Server", icon: Braces, blurb: "Live diagnostics from rust-analyzer, tsserver, pylsp, gopls." },
  { name: "Testing", icon: FlaskConical, blurb: "Run tests with parsed cargo / Jest / Vitest / pytest summaries." },
  { name: "Containers", icon: Container, blurb: "List and control Docker containers and images." },
  { name: "Database", icon: Database, blurb: "Browse SQLite tables and run read-only queries." },
  { name: "APIs", icon: Globe, blurb: "A REST client with a JSON-aware response viewer." },
];

export function Plugins() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
          <Puzzle className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Plugins</h1>
          <p className="text-sm text-fg-subtle">
            Everything Orbit can do, and what's coming from the community.
          </p>
        </div>
      </header>

      {/* Disabled search, to signal the shape of the coming marketplace. */}
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 px-3 opacity-60 sm:max-w-md">
        <Search className="h-4 w-4 text-fg-subtle" />
        <input
          disabled
          placeholder="Search the marketplace… (coming soon)"
          className="h-9 w-full cursor-not-allowed bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>

      <section>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          Built-in
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-fg-subtle">
            {BUILTINS.length}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {BUILTINS.map((c) => (
            <div
              key={c.name}
              className="flex items-start gap-3 rounded-xl border border-border bg-panel p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-fg-muted">
                <c.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fg">{c.name}</span>
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                    Built-in
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-fg-subtle">{c.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-fg">A community marketplace is on the roadmap</h2>
        <p className="mt-1 max-w-2xl text-sm text-fg-subtle">
          A versioned plugin SDK will let extensions contribute languages, themes,
          panels, commands, AI providers, debuggers and more — installed, updated
          and toggled from here. It isn't built yet; this page shows what ships in
          the box today.
        </p>
        <a
          href="https://github.com/martin-k-m/orbit/blob/main/ROADMAP.md"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 transition-colors hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Follow the roadmap
        </a>
      </section>
    </div>
  );
}
