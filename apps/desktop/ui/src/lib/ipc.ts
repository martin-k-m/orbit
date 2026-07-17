import { invoke } from "@tauri-apps/api/core";
import type {
  ActivityReport,
  Assessment,
  CommandOutput,
  Commit,
  Dependency,
  EnvReport,
  FileContents,
  FileNode,
  GitInfo,
  GitStatus,
  HealthReport,
  ProjectDetail,
  ProjectSummary,
  SearchResults,
  Shell,
  TerminalExit,
  TerminalOutput,
  Workspace,
} from "./types";

/** True when running inside the Tauri runtime (vs. a plain browser / CI). */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// ---------------------------------------------------------------------------
// Demo data — used when not running inside Tauri so the app renders in a plain
// browser (local dev, CI screenshots) and degrades gracefully.
// ---------------------------------------------------------------------------

const HOUR = 3600 * 1000;
const now = Date.now();

const DEMO_SUMMARIES: ProjectSummary[] = [
  {
    id: "orbit",
    name: "Orbit",
    path: "/Users/dev/code/orbit",
    primaryLanguage: "rust",
    description: "Local-first developer command center",
    hasProfile: true,
    dependencyCount: 41,
    ecosystemLink: null,
    commandCount: 5,
    gitBranch: "main",
    gitClean: false,
    changedFiles: 7,
    lastOpened: now - 0.4 * HOUR,
    pinned: true,
  },
  {
    id: "blink",
    name: "Blink",
    path: "/Users/dev/code/blink",
    primaryLanguage: "rust",
    description: "Developer acceleration toolkit",
    hasProfile: true,
    dependencyCount: 28,
    ecosystemLink: "blink",
    commandCount: 6,
    gitBranch: "feat/cache-warm",
    gitClean: true,
    changedFiles: 0,
    lastOpened: now - 2 * HOUR,
    pinned: true,
  },
  {
    id: "beacon",
    name: "Beacon",
    path: "/Users/dev/code/beacon",
    primaryLanguage: "type-script",
    description: "Runtime monitoring dashboard",
    hasProfile: false,
    dependencyCount: 23,
    ecosystemLink: "beacon",
    commandCount: 4,
    gitBranch: "main",
    gitClean: true,
    changedFiles: 0,
    lastOpened: now - 26 * HOUR,
    pinned: false,
  },
  {
    id: "killer",
    name: "Killer",
    path: "/Users/dev/code/killer",
    primaryLanguage: "rust",
    description: "Security engine",
    hasProfile: true,
    dependencyCount: 34,
    ecosystemLink: "killer",
    commandCount: 5,
    gitBranch: "main",
    gitClean: false,
    changedFiles: 3,
    lastOpened: now - 3 * 24 * HOUR,
    pinned: false,
  },
  {
    id: "flux",
    name: "Flux",
    path: "/Users/dev/code/flux",
    primaryLanguage: "go",
    description: "Automation platform",
    hasProfile: false,
    dependencyCount: 19,
    ecosystemLink: "flux",
    commandCount: 4,
    gitBranch: "release/1.4",
    gitClean: true,
    changedFiles: 0,
    lastOpened: now - 6 * 24 * HOUR,
    pinned: false,
  },
];

const DEMO_DETAILS: Record<string, ProjectDetail> = {
  "/Users/dev/code/orbit": {
    project: {
      id: "orbit",
      name: "Orbit",
      path: "/Users/dev/code/orbit",
      primaryLanguage: "rust",
      description: "Local-first developer command center",
      hasProfile: true,
      dependencyCount: 41,
      ecosystemLink: null,
      ecosystems: [
        {
          language: "rust",
          framework: "Tauri",
          manifest: "Cargo.toml",
          commands: [
            { name: "build", program: "cargo", args: ["build"], description: "Compile the workspace", source: "detected" },
            { name: "test", program: "cargo", args: ["test"], description: "Run the test suite", source: "detected" },
            { name: "dev", program: "cargo", args: ["tauri", "dev"], description: "Run desktop app in dev mode", source: "profile" },
          ],
        },
      ],
      commands: [
        { name: "build", program: "cargo", args: ["build"], description: "Compile the workspace", source: "detected" },
        { name: "test", program: "cargo", args: ["test"], description: "Run the test suite", source: "detected" },
        { name: "lint", program: "cargo", args: ["clippy"], description: "Lint with clippy", source: "detected" },
        { name: "dev", program: "cargo", args: ["tauri", "dev"], description: "Run desktop app in dev mode", source: "profile" },
        { name: "fmt", program: "cargo", args: ["fmt"], description: "Format the codebase", source: "convention" },
      ],
    },
    git: {
      branch: "main",
      isClean: false,
      changedFiles: 7,
      ahead: 2,
      behind: 0,
      lastCommit: {
        hash: "9f2c1a4e8b7d3f60a1c2e5f7b9d0a3c6e8f1b2d4",
        shortHash: "9f2c1a4",
        summary: "feat(ui): glass command palette + page transitions",
        author: "Martin Muskov",
        timestamp: now - 0.6 * HOUR,
      },
    },
    health: {
      score: 92,
      fileCount: 214,
      totalLines: 28430,
      todoCount: 12,
      warnings: [
        { kind: "large-file", message: "app.rs is 640 lines — consider splitting", path: "src/app.rs", penalty: 5 },
        { kind: "todo", message: "12 TODO/FIXME markers across the codebase", path: null, penalty: 3 },
      ],
    },
    dependencies: [
      { name: "tauri", current: "2.1.1", dev: false, language: "rust" },
      { name: "serde", current: "1.0.217", dev: false, language: "rust" },
      { name: "tokio", current: "1.42.0", dev: false, language: "rust" },
      { name: "sqlx", current: "0.8.2", dev: false, language: "rust" },
      { name: "anyhow", current: "1.0.95", dev: false, language: "rust" },
      { name: "tracing", current: "0.1.41", dev: false, language: "rust" },
      { name: "insta", current: "1.42.0", dev: true, language: "rust" },
    ],
  },
  "/Users/dev/code/blink": {
    project: {
      id: "blink",
      name: "Blink",
      path: "/Users/dev/code/blink",
      primaryLanguage: "rust",
      description: "Developer acceleration toolkit",
      hasProfile: true,
      dependencyCount: 28,
      ecosystemLink: "blink",
      ecosystems: [
        {
          language: "rust",
          framework: null,
          manifest: "Cargo.toml",
          commands: [
            { name: "build", program: "cargo", args: ["build", "--release"], description: "Release build", source: "detected" },
            { name: "bench", program: "cargo", args: ["bench"], description: "Run benchmarks", source: "detected" },
          ],
        },
      ],
      commands: [
        { name: "build", program: "cargo", args: ["build", "--release"], description: "Release build", source: "detected" },
        { name: "test", program: "cargo", args: ["test"], description: "Run the test suite", source: "detected" },
        { name: "bench", program: "cargo", args: ["bench"], description: "Run benchmarks", source: "detected" },
        { name: "warm", program: "blink", args: ["warm"], description: "Warm the build cache", source: "profile" },
        { name: "accelerate", program: "blink", args: ["accelerate"], description: "Accelerate incremental builds", source: "profile" },
        { name: "fmt", program: "cargo", args: ["fmt"], description: "Format the codebase", source: "convention" },
      ],
    },
    git: {
      branch: "feat/cache-warm",
      isClean: true,
      changedFiles: 0,
      ahead: 0,
      behind: 1,
      lastCommit: {
        hash: "3a7b9c2d1e4f5061728394a5b6c7d8e9f0a1b2c3",
        shortHash: "3a7b9c2",
        summary: "perf: parallelize dependency graph resolution",
        author: "Martin Muskov",
        timestamp: now - 2.2 * HOUR,
      },
    },
    health: {
      score: 87,
      fileCount: 156,
      totalLines: 19875,
      todoCount: 8,
      warnings: [
        { kind: "large-file", message: "parser.rs is 900 lines — consider splitting", path: "src/parser.rs", penalty: 8 },
        { kind: "outdated-dependency", message: "5 dependencies have newer versions available", path: "Cargo.toml", penalty: 5 },
      ],
    },
    dependencies: [
      { name: "clap", current: "4.5.23", dev: false, language: "rust" },
      { name: "rayon", current: "1.10.0", dev: false, language: "rust" },
      { name: "dashmap", current: "6.1.0", dev: false, language: "rust" },
      { name: "notify", current: "7.0.0", dev: false, language: "rust" },
      { name: "criterion", current: "0.5.1", dev: true, language: "rust" },
    ],
  },
  "/Users/dev/code/beacon": {
    project: {
      id: "beacon",
      name: "Beacon",
      path: "/Users/dev/code/beacon",
      primaryLanguage: "type-script",
      description: "Runtime monitoring dashboard",
      hasProfile: false,
      dependencyCount: 23,
      ecosystemLink: "beacon",
      ecosystems: [
        {
          language: "type-script",
          framework: "Next.js",
          manifest: "package.json",
          commands: [
            { name: "dev", program: "npm", args: ["run", "dev"], description: "Start the dev server", source: "detected" },
            { name: "build", program: "npm", args: ["run", "build"], description: "Production build", source: "detected" },
          ],
        },
      ],
      commands: [
        { name: "dev", program: "npm", args: ["run", "dev"], description: "Start the dev server", source: "detected" },
        { name: "build", program: "npm", args: ["run", "build"], description: "Production build", source: "detected" },
        { name: "test", program: "npm", args: ["test"], description: "Run tests", source: "detected" },
        { name: "lint", program: "npm", args: ["run", "lint"], description: "Lint the project", source: "convention" },
      ],
    },
    git: {
      branch: "main",
      isClean: true,
      changedFiles: 0,
      ahead: 0,
      behind: 0,
      lastCommit: {
        hash: "5c8d1e2f3a4b5061728394a5b6c7d8e9f0a1b2c3",
        shortHash: "5c8d1e2",
        summary: "feat: add p95 latency panel to overview",
        author: "Martin Muskov",
        timestamp: now - 26 * HOUR,
      },
    },
    health: {
      score: 79,
      fileCount: 189,
      totalLines: 16240,
      todoCount: 21,
      warnings: [
        { kind: "todo", message: "21 TODO/FIXME markers across the codebase", path: null, penalty: 6 },
        { kind: "missing-tests", message: "3 route handlers have no test coverage", path: "app/api", penalty: 9 },
        { kind: "outdated-dependency", message: "next is 2 minor versions behind", path: "package.json", penalty: 6 },
      ],
    },
    dependencies: [
      { name: "next", current: "15.1.3", dev: false, language: "type-script" },
      { name: "react", current: "19.0.0", dev: false, language: "type-script" },
      { name: "recharts", current: "2.15.0", dev: false, language: "type-script" },
      { name: "zod", current: "3.24.1", dev: false, language: "type-script" },
      { name: "tailwindcss", current: "3.4.17", dev: true, language: "type-script" },
      { name: "vitest", current: "2.1.8", dev: true, language: "type-script" },
    ],
  },
  "/Users/dev/code/killer": {
    project: {
      id: "killer",
      name: "Killer",
      path: "/Users/dev/code/killer",
      primaryLanguage: "rust",
      description: "Security engine",
      hasProfile: true,
      dependencyCount: 34,
      ecosystemLink: "killer",
      ecosystems: [
        {
          language: "rust",
          framework: null,
          manifest: "Cargo.toml",
          commands: [
            { name: "build", program: "cargo", args: ["build", "--release"], description: "Release build", source: "detected" },
            { name: "scan", program: "killer", args: ["scan"], description: "Run a security scan", source: "profile" },
          ],
        },
      ],
      commands: [
        { name: "build", program: "cargo", args: ["build", "--release"], description: "Release build", source: "detected" },
        { name: "test", program: "cargo", args: ["test"], description: "Run the test suite", source: "detected" },
        { name: "scan", program: "killer", args: ["scan"], description: "Run a security scan", source: "profile" },
        { name: "audit", program: "cargo", args: ["audit"], description: "Audit dependencies", source: "detected" },
        { name: "fmt", program: "cargo", args: ["fmt"], description: "Format the codebase", source: "convention" },
      ],
    },
    git: {
      branch: "main",
      isClean: false,
      changedFiles: 3,
      ahead: 1,
      behind: 0,
      lastCommit: {
        hash: "7e1f2a3b4c5d6071829304a5b6c7d8e9f0a1b2c3",
        shortHash: "7e1f2a3",
        summary: "fix: patch CVE in transitive tls dependency",
        author: "Martin Muskov",
        timestamp: now - 3 * 24 * HOUR,
      },
    },
    health: {
      score: 90,
      fileCount: 172,
      totalLines: 22110,
      todoCount: 5,
      warnings: [
        { kind: "todo", message: "5 TODO/FIXME markers across the codebase", path: null, penalty: 2 },
      ],
    },
    dependencies: [
      { name: "ring", current: "0.17.8", dev: false, language: "rust" },
      { name: "rustls", current: "0.23.20", dev: false, language: "rust" },
      { name: "regex", current: "1.11.1", dev: false, language: "rust" },
      { name: "serde_json", current: "1.0.134", dev: false, language: "rust" },
      { name: "proptest", current: "1.6.0", dev: true, language: "rust" },
    ],
  },
  "/Users/dev/code/flux": {
    project: {
      id: "flux",
      name: "Flux",
      path: "/Users/dev/code/flux",
      primaryLanguage: "go",
      description: "Automation platform",
      hasProfile: false,
      dependencyCount: 19,
      ecosystemLink: "flux",
      ecosystems: [
        {
          language: "go",
          framework: null,
          manifest: "go.mod",
          commands: [
            { name: "build", program: "go", args: ["build", "./..."], description: "Build all packages", source: "detected" },
            { name: "test", program: "go", args: ["test", "./..."], description: "Run all tests", source: "detected" },
          ],
        },
      ],
      commands: [
        { name: "build", program: "go", args: ["build", "./..."], description: "Build all packages", source: "detected" },
        { name: "test", program: "go", args: ["test", "./..."], description: "Run all tests", source: "detected" },
        { name: "run", program: "go", args: ["run", "."], description: "Run the application", source: "detected" },
        { name: "vet", program: "go", args: ["vet", "./..."], description: "Vet the codebase", source: "convention" },
      ],
    },
    git: {
      branch: "release/1.4",
      isClean: true,
      changedFiles: 0,
      ahead: 0,
      behind: 0,
      lastCommit: {
        hash: "1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4",
        shortHash: "1b2c3d4",
        summary: "chore: cut 1.4.0 release candidate",
        author: "Martin Muskov",
        timestamp: now - 6 * 24 * HOUR,
      },
    },
    health: {
      score: 84,
      fileCount: 143,
      totalLines: 15320,
      todoCount: 9,
      warnings: [
        { kind: "todo", message: "9 TODO/FIXME markers across the codebase", path: null, penalty: 4 },
        { kind: "large-file", message: "scheduler.go is 720 lines — consider splitting", path: "internal/scheduler.go", penalty: 6 },
      ],
    },
    dependencies: [
      { name: "cobra", current: "1.8.1", dev: false, language: "go" },
      { name: "viper", current: "1.19.0", dev: false, language: "go" },
      { name: "zap", current: "1.27.0", dev: false, language: "go" },
      { name: "testify", current: "1.10.0", dev: true, language: "go" },
    ],
  },
};

const DEMO_ACTIVITY: ActivityReport = {
  totalSeconds: 25 * 3600,
  projectsTouched: 5,
  sessionCount: 34,
  languages: [
    { language: "rust", seconds: 14 * 3600 },
    { language: "type-script", seconds: 8 * 3600 },
    { language: "python", seconds: 3 * 3600 },
  ],
  medianBuildMs: 2000,
};

const demoSettings = new Map<string, string>([
  ["theme", "dark"],
  ["data-location", "~/Library/Application Support/com.orbit.dev"],
]);

// Shells the browser demo pretends to have found.
const DEMO_SHELLS: Shell[] = [
  { label: "Zsh", program: "/bin/zsh", args: ["-l"], kind: "zsh" },
  { label: "Bash", program: "/bin/bash", args: ["-l"], kind: "bash" },
  { label: "sh", program: "/bin/sh", args: [], kind: "sh" },
];

// A tiny fake project tree for the browser demo (no filesystem there).
function demoDir(path: string): FileNode[] {
  const isRoot = !path.includes("/src");
  const dir = (name: string): FileNode => ({
    name,
    path: `${path}/${name}`,
    isDir: true,
    hidden: name.startsWith("."),
    size: 0,
    language: null,
  });
  const file = (name: string, language: string, size = 1024): FileNode => ({
    name,
    path: `${path}/${name}`,
    isDir: false,
    hidden: name.startsWith("."),
    size,
    language,
  });
  return isRoot
    ? [dir("src"), file("Cargo.toml", "toml"), file("README.md", "markdown", 3400)]
    : [file("main.rs", "rust", 820), file("lib.rs", "rust", 2400)];
}

function demoFile(path: string): FileContents {
  const rust = path.endsWith(".rs");
  return {
    text: rust
      ? 'fn main() {\n    // Orbit demo — open the desktop app to edit real files.\n    println!("hello from Orbit");\n}\n'
      : "# Orbit\n\nThis is a demo file. Run the desktop app to open your project.\n",
    language: rust ? "rust" : "markdown",
    encoding: "utf-8",
    lineEnding: "lf",
    binary: false,
    truncated: false,
    size: 96,
  };
}

// Workspaces the demo has handed out, so edits persist for the session.
const demoWorkspaces = new Map<string, Workspace>();

// A representative env report for the browser demo.
const DEMO_ENV_REPORT: EnvReport = {
  files: [
    {
      path: "/Users/dev/code/beacon/.env",
      scope: "default",
      entries: [
        { key: "PORT", value: "3000", line: 1, secret: false },
        { key: "NODE_ENV", value: "development", line: 2, secret: false },
        {
          key: "DATABASE_URL",
          value: "postgres://localhost:5432/beacon",
          line: 3,
          secret: false,
        },
        { key: "API_TOKEN", value: "sk_live_51H8xQ2eZvKY", line: 4, secret: true },
      ],
    },
    {
      path: "/Users/dev/code/beacon/.env.example",
      scope: "example",
      entries: [
        { key: "PORT", value: "", line: 1, secret: false },
        { key: "NODE_ENV", value: "", line: 2, secret: false },
        { key: "DATABASE_URL", value: "", line: 3, secret: false },
        { key: "API_TOKEN", value: "", line: 4, secret: true },
        { key: "SENTRY_DSN", value: "", line: 5, secret: true },
      ],
    },
  ],
  issues: [
    {
      kind: "missing",
      message: "`SENTRY_DSN` is in .env.example but missing here",
      file: ".env",
      key: "SENTRY_DSN",
    },
  ],
};

// A mutable copy so demo mutations (pin/remove/add) feel real in the browser.
let demoSummaries: ProjectSummary[] = DEMO_SUMMARIES.map((p) => ({ ...p }));

function detailFor(path: string): ProjectDetail {
  const detail = DEMO_DETAILS[path];
  if (detail) return detail;
  // Fabricate a minimal detail for unknown demo paths.
  const summary = demoSummaries.find((p) => p.path === path);
  const name = summary?.name ?? "Project";
  return {
    project: {
      id: summary?.id ?? name.toLowerCase(),
      name,
      path,
      primaryLanguage: summary?.primaryLanguage ?? "unknown",
      description: summary?.description ?? null,
      hasProfile: summary?.hasProfile ?? false,
      dependencyCount: summary?.dependencyCount ?? 0,
      ecosystemLink: summary?.ecosystemLink ?? null,
      ecosystems: [],
      commands: [],
    },
    git: null,
    health: { score: 75, fileCount: 0, totalLines: 0, todoCount: 0, warnings: [] },
    dependencies: [],
  };
}

// ---------------------------------------------------------------------------
// Typed IPC wrappers. Fall back to demo data outside Tauri.
// ---------------------------------------------------------------------------

export async function scanFolder(path: string): Promise<ProjectSummary[]> {
  if (!isTauri()) return demoSummaries;
  return invoke<ProjectSummary[]>("scan_folder", { path });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  if (!isTauri()) return demoSummaries;
  return invoke<ProjectSummary[]>("list_projects");
}

export async function addProject(path: string): Promise<ProjectSummary[]> {
  if (!isTauri()) {
    const name = path.split(/[\\/]/).filter(Boolean).pop() ?? "New Project";
    if (!demoSummaries.some((p) => p.path === path)) {
      demoSummaries = [
        ...demoSummaries,
        {
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          path,
          primaryLanguage: "unknown",
          description: null,
          hasProfile: false,
          dependencyCount: 0,
          ecosystemLink: null,
          commandCount: 0,
          gitBranch: null,
          gitClean: null,
          changedFiles: null,
          lastOpened: Date.now(),
          pinned: false,
        },
      ];
    }
    return demoSummaries;
  }
  return invoke<ProjectSummary[]>("add_project", { path });
}

export async function removeProject(id: string): Promise<void> {
  if (!isTauri()) {
    demoSummaries = demoSummaries.filter((p) => p.id !== id);
    return;
  }
  return invoke<void>("remove_project", { id });
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  if (!isTauri()) {
    demoSummaries = demoSummaries.map((p) =>
      p.id === id ? { ...p, pinned } : p,
    );
    return;
  }
  return invoke<void>("set_pinned", { id, pinned });
}

export async function openProject(
  id: string,
  path: string,
): Promise<ProjectDetail> {
  if (!isTauri()) {
    demoSummaries = demoSummaries.map((p) =>
      p.id === id ? { ...p, lastOpened: Date.now() } : p,
    );
    return detailFor(path);
  }
  return invoke<ProjectDetail>("open_project", { id, path });
}

export async function projectDetail(path: string): Promise<ProjectDetail> {
  if (!isTauri()) return detailFor(path);
  return invoke<ProjectDetail>("project_detail", { path });
}

export async function projectHealth(path: string): Promise<HealthReport> {
  if (!isTauri()) return detailFor(path).health;
  return invoke<HealthReport>("project_health", { path });
}

export async function projectDeps(path: string): Promise<Dependency[]> {
  if (!isTauri()) return detailFor(path).dependencies;
  return invoke<Dependency[]>("project_deps", { path });
}

export async function gitInfo(path: string): Promise<GitInfo | null> {
  if (!isTauri()) return detailFor(path).git ?? null;
  return invoke<GitInfo | null>("git_info", { path });
}

// --- Source control ---------------------------------------------------------

/** Grouped staged/unstaged status, or null when the project is not a repo. */
export async function gitStatus(path: string): Promise<GitStatus | null> {
  if (!isTauri()) return null;
  return invoke<GitStatus | null>("git_status", { path });
}

/** Stage one file, or every change when `file` is omitted. */
export async function gitStage(path: string, file?: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("git_stage", { path, file: file ?? null });
}

/** Unstage one file, or everything when `file` is omitted. */
export async function gitUnstage(path: string, file?: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("git_unstage", { path, file: file ?? null });
}

/** The unified diff for a file, staged (`--cached`) or working-tree. */
export async function gitDiff(
  path: string,
  file: string,
  staged: boolean,
): Promise<string> {
  if (!isTauri()) return "";
  return invoke<string>("git_diff", { path, file, staged });
}

/** Commit the staged changes; resolves with the new commit. */
export async function gitCommit(path: string, message: string): Promise<Commit> {
  return invoke<Commit>("git_commit", { path, message });
}

/** The most recent commits, newest first. */
export async function gitLog(path: string, limit = 20): Promise<Commit[]> {
  if (!isTauri()) return [];
  return invoke<Commit[]>("git_log", { path, limit });
}

/** Local branch names. */
export async function gitBranches(path: string): Promise<string[]> {
  if (!isTauri()) return [];
  return invoke<string[]>("git_branches", { path });
}

/** Switch to an existing branch. */
export async function gitSwitchBranch(path: string, name: string): Promise<void> {
  return invoke<void>("git_switch_branch", { path, name });
}

/** Create a new branch off HEAD and switch to it. */
export async function gitCreateBranch(path: string, name: string): Promise<void> {
  return invoke<void>("git_create_branch", { path, name });
}

/** Fetch remote-tracking refs. */
export async function gitFetch(path: string): Promise<void> {
  return invoke<void>("git_fetch", { path });
}

/** Fast-forward pull from upstream. */
export async function gitPull(path: string): Promise<void> {
  return invoke<void>("git_pull", { path });
}

/** Push the current branch to its upstream. */
export async function gitPush(path: string): Promise<void> {
  return invoke<void>("git_push", { path });
}

/**
 * Assess how risky a project's command is before running it. Mirrors the
 * engine's `orbit_core::safety` guard so the UI can show a confirmation dialog.
 */
export async function assessCommand(
  path: string,
  name: string,
): Promise<Assessment> {
  if (!isTauri()) {
    const detail = detailFor(path);
    const cmd = detail.project.commands.find((c) => c.name === name);
    return assessDemo(cmd ? [cmd.program, ...cmd.args].join(" ") : name);
  }
  return invoke<Assessment>("assess_command", { path, name });
}

export async function runCommand(
  path: string,
  name: string,
  confirmed?: boolean,
): Promise<CommandOutput> {
  if (!isTauri()) {
    const detail = detailFor(path);
    const cmd = detail.project.commands.find((c) => c.name === name);
    const invocation = cmd ? [cmd.program, ...cmd.args].join(" ") : name;
    const assessment = assessDemo(invocation);
    if (assessment.risk === "dangerous" && confirmed !== true) {
      throw new Error(`confirmation required: ${assessment.reasons.join("; ")}`);
    }
    return {
      code: 0,
      stdout: `$ ${invocation}\n\n[demo] Executed "${name}" in ${detail.project.name}.\nFinished in 2.0s — 0 errors, 0 warnings.\n`,
      stderr: "",
    };
  }
  return invoke<CommandOutput>("run_command", { path, name, confirmed });
}

/** A tiny client-side mirror of the engine's dangerous-command heuristic. */
function assessDemo(line: string): Assessment {
  const l = ` ${line.toLowerCase()} `;
  const reasons: string[] = [];
  if (/ rm .*-(rf|fr)/.test(l) || l.includes("remove-item") && l.includes("-recurse")) {
    reasons.push("Recursive, forced file deletion");
  }
  if (l.includes("mkfs") || l.includes(" dd ") || l.includes("of=/dev/")) {
    reasons.push("Low-level disk operation");
  }
  if ((l.includes("curl") || l.includes("wget")) && (l.includes("| sh") || l.includes("| bash"))) {
    reasons.push("Downloads and executes a remote script");
  }
  return { risk: reasons.length ? "dangerous" : "safe", reasons };
}

export async function generateProfile(path: string): Promise<string> {
  if (!isTauri()) {
    const detail = detailFor(path);
    return `# orbit.toml — generated for ${detail.project.name}\n[project]\nname = "${detail.project.name}"\nlanguage = "${detail.project.primaryLanguage}"\n`;
  }
  return invoke<string>("generate_profile", { path });
}

export async function activityReport(days?: number): Promise<ActivityReport> {
  if (!isTauri()) return DEMO_ACTIVITY;
  return invoke<ActivityReport>("activity_report", { days });
}

// --- Workspaces -------------------------------------------------------------

/**
 * Load a project's workspace (terminals, tasks, bookmarks, notes). A project
 * opened for the first time comes back seeded from its detected commands.
 */
export async function getWorkspace(id: string, path: string): Promise<Workspace> {
  if (!isTauri()) {
    const existing = demoWorkspaces.get(id);
    if (existing) return existing;
    const detail = detailFor(path);
    const seeded: Workspace = {
      projectId: id,
      notes: "",
      terminals: [],
      bookmarks: [],
      tasks: detail.project.commands.map((c) => ({
        id: `detected:${c.name}`,
        name: c.name,
        command: [c.program, ...c.args].join(" "),
        favorite: ["dev", "test", "build"].includes(c.name),
      })),
      updatedAt: 0,
    };
    demoWorkspaces.set(id, seeded);
    return seeded;
  }
  return invoke<Workspace>("get_workspace", { id, path });
}

/** Persist a project's workspace. */
export async function saveWorkspace(workspace: Workspace): Promise<void> {
  if (!isTauri()) {
    demoWorkspaces.set(workspace.projectId, {
      ...workspace,
      updatedAt: Math.floor(Date.now() / 1000),
    });
    return;
  }
  return invoke<void>("save_workspace", { workspace });
}

/** Run a workspace task. Destructive tasks require `confirmed: true`. */
export async function runTask(
  path: string,
  commandLine: string,
  confirmed?: boolean,
): Promise<CommandOutput> {
  if (!isTauri()) {
    const assessment = assessDemo(commandLine);
    if (assessment.risk === "dangerous" && confirmed !== true) {
      throw new Error(`confirmation required: ${assessment.reasons.join("; ")}`);
    }
    return {
      code: 0,
      stdout: `$ ${commandLine}\n\n[demo] Task finished in 1.2s.\n`,
      stderr: "",
    };
  }
  return invoke<CommandOutput>("run_task", { path, commandLine, confirmed });
}

// --- Files: explorer + editor -----------------------------------------------

/** List a directory's immediate children (directories first, then files). */
export async function readDir(path: string): Promise<FileNode[]> {
  if (!isTauri()) return demoDir(path);
  return invoke<FileNode[]>("read_dir", { path });
}

/** Read a file for the editor, with encoding/line-ending/language metadata. */
export async function readFile(path: string): Promise<FileContents> {
  if (!isTauri()) return demoFile(path);
  return invoke<FileContents>("read_file", { path });
}

/** Save text back to a file. */
export async function writeFile(path: string, contents: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("write_file", { path, contents });
}

/** A flat, capped list of a project's files (relative paths) for quick-open. */
export async function listFiles(path: string): Promise<string[]> {
  if (!isTauri()) return [];
  return invoke<string[]>("list_files", { path });
}

/**
 * Search a project for a literal string ("find in files"). Ignored, binary and
 * oversized files are skipped in the engine; results are capped.
 */
export async function searchWorkspace(
  root: string,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): Promise<SearchResults> {
  if (!isTauri()) {
    return { fileCount: 0, matchCount: 0, truncated: false, files: [] };
  }
  return invoke<SearchResults>("search_workspace", {
    root,
    query,
    caseSensitive,
    wholeWord,
  });
}

// --- Terminal ---------------------------------------------------------------

/** The shells installed on this machine, best first. */
export async function terminalShells(): Promise<Shell[]> {
  if (!isTauri()) return DEMO_SHELLS;
  return invoke<Shell[]>("terminal_shells");
}

/**
 * Open a shell on a PTY in `path`. Output arrives as `terminal:output` events;
 * subscribe with {@link onTerminalOutput} before writing.
 */
export async function terminalOpen(
  path: string,
  shell?: string,
  cols = 80,
  rows = 24,
): Promise<string> {
  if (!isTauri()) return `demo-term-${Math.random().toString(36).slice(2, 8)}`;
  return invoke<string>("terminal_open", { path, shell, cols, rows });
}

/** Send keystrokes to a session. */
export async function terminalWrite(id: string, data: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("terminal_write", { id, data });
}

/** Tell a session its viewport changed size, so the shell reflows. */
export async function terminalResize(
  id: string,
  cols: number,
  rows: number,
): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("terminal_resize", { id, cols, rows });
}

/** Close a session and kill its shell. */
export async function terminalClose(id: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("terminal_close", { id });
}

/** Subscribe to terminal output. Returns an unlisten function. */
export async function onTerminalOutput(
  handler: (payload: TerminalOutput) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<TerminalOutput>("terminal:output", (e) =>
    handler(e.payload),
  );
  return unlisten;
}

/** Subscribe to session exits. Returns an unlisten function. */
export async function onTerminalExit(
  handler: (payload: TerminalExit) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<TerminalExit>("terminal:exit", (e) =>
    handler(e.payload),
  );
  return unlisten;
}

// --- Environment files ------------------------------------------------------

/** Report a project's .env files plus any duplicate/empty/invalid/missing vars. */
export async function envReport(path: string): Promise<EnvReport> {
  if (!isTauri()) return DEMO_ENV_REPORT;
  return invoke<EnvReport>("env_report", { path });
}

export async function getSetting(key: string): Promise<string | null> {
  if (!isTauri()) return demoSettings.get(key) ?? null;
  return invoke<string | null>("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!isTauri()) {
    demoSettings.set(key, value);
    return;
  }
  return invoke<void>("set_setting", { key, value });
}

export async function openTerminal(path: string): Promise<void> {
  if (!isTauri()) {
    // eslint-disable-next-line no-console
    console.info(`[demo] open terminal at ${path}`);
    return;
  }
  return invoke<void>("open_terminal", { path });
}

export async function appVersion(): Promise<string> {
  if (!isTauri()) return "0.1.0-demo";
  return invoke<string>("app_version");
}

/** Open the native folder picker; returns null if cancelled. */
export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) {
    return "/Users/dev/code/new-project";
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({ directory: true, multiple: false });
  if (result == null) return null;
  return Array.isArray(result) ? (result[0] ?? null) : result;
}
