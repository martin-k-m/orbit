export type Language =
  | "rust"
  | "type-script"
  | "java-script"
  | "python"
  | "go"
  | "docker"
  | "unknown";

export type EcosystemLink = "blink" | "killer" | "flux" | "beacon";

export type CommandSource = "detected" | "profile" | "convention";

export interface Command {
  name: string;
  program: string;
  args: string[];
  description?: string | null;
  source: CommandSource;
}

export interface Ecosystem {
  language: Language;
  framework?: string | null;
  manifest: string;
  commands: Command[];
}

export interface Project {
  id: string;
  name: string;
  path: string;
  primaryLanguage: Language;
  ecosystems: Ecosystem[];
  commands: Command[];
  description?: string | null;
  hasProfile: boolean;
  dependencyCount: number;
  ecosystemLink?: EcosystemLink | null;
}

export interface Commit {
  hash: string;
  shortHash: string;
  summary: string;
  author: string;
  timestamp: number;
}

export interface GitInfo {
  branch: string;
  isClean: boolean;
  changedFiles: number;
  ahead: number;
  behind: number;
  lastCommit?: Commit | null;
}

export interface HealthWarning {
  kind: string;
  message: string;
  path?: string | null;
  penalty: number;
}

export interface HealthReport {
  score: number;
  fileCount: number;
  totalLines: number;
  todoCount: number;
  warnings: HealthWarning[];
}

export interface Dependency {
  name: string;
  current: string;
  dev: boolean;
  language: Language;
}

export interface ProjectDetail {
  project: Project;
  git?: GitInfo | null;
  health: HealthReport;
  dependencies: Dependency[];
}

export interface CommandOutput {
  code: number;
  stdout: string;
  stderr: string;
}

/** How risky a command looks — mirrors `orbit_core::safety::Risk`. */
export type Risk = "safe" | "caution" | "dangerous";

/** The result of assessing a command — mirrors `orbit_core::safety::Assessment`. */
export interface Assessment {
  risk: Risk;
  reasons: string[];
}

export interface LanguageStat {
  language: Language;
  seconds: number;
}

export interface ActivityReport {
  totalSeconds: number;
  projectsTouched: number;
  sessionCount: number;
  languages: LanguageStat[];
  medianBuildMs?: number | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  primaryLanguage: Language;
  description?: string | null;
  hasProfile: boolean;
  dependencyCount: number;
  ecosystemLink?: EcosystemLink | null;
  commandCount: number;
  gitBranch?: string | null;
  gitClean?: boolean | null;
  changedFiles?: number | null;
  lastOpened?: number | null;
  pinned: boolean;
}

export const LANGUAGE_META: Record<Language, { label: string; color: string }> = {
  rust: { label: "Rust", color: "#F74C00" },
  "type-script": { label: "TypeScript", color: "#3178C6" },
  "java-script": { label: "JavaScript", color: "#F7DF1E" },
  python: { label: "Python", color: "#3776AB" },
  go: { label: "Go", color: "#00ADD8" },
  docker: { label: "Docker", color: "#2496ED" },
  unknown: { label: "Unknown", color: "#8B8B8B" },
};

export const ECOSYSTEM_META: Record<
  EcosystemLink,
  { label: string; tagline: string; accent: string }
> = {
  blink: {
    label: "Blink",
    tagline: "Developer acceleration toolkit",
    accent: "#6366F1",
  },
  killer: { label: "Killer", tagline: "Security engine", accent: "#EF4444" },
  flux: { label: "Flux", tagline: "Automation platform", accent: "#22D3EE" },
  beacon: { label: "Beacon", tagline: "Runtime monitoring", accent: "#F59E0B" },
};
