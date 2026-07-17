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

/** A commit plus commit-graph lane data for drawing a history rail. */
export interface GraphCommit {
  commit: Commit;
  parents: string[];
  /** The column this commit's node sits in. */
  lane: number;
  /** Every column with a line passing through this commit's row. */
  rails: number[];
}

export interface GitInfo {
  branch: string;
  isClean: boolean;
  changedFiles: number;
  ahead: number;
  behind: number;
  lastCommit?: Commit | null;
}

/** One changed path (mirrors `orbit_core::git::StatusEntry`). */
export interface GitStatusEntry {
  path: string;
  /** Git status letter: M, A, D, R, C, U, ? … */
  code: string;
  /** Human label, e.g. "Modified". */
  label: string;
}

/** Grouped source-control status (mirrors `orbit_core::git::GitStatus`). */
export interface GitStatus {
  branch: string;
  staged: GitStatusEntry[];
  unstaged: GitStatusEntry[];
  ahead: number;
  behind: number;
}

/** One entry on the stash stack (mirrors `orbit_core::git::StashEntry`). */
export interface StashEntry {
  reference: string;
  message: string;
}

/** A Docker container (mirrors `orbit_core::docker::Container`). */
export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string;
}

/** A Docker image (mirrors `orbit_core::docker::Image`). */
export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
}

/** A SQLite table/view (mirrors `orbit_core::db::Table`). */
export interface DbTable {
  name: string;
  rowCount: number;
}

/** A query result (mirrors `orbit_core::db::QueryResult`). Cells are null-able. */
export interface DbQueryResult {
  columns: string[];
  rows: (string | null)[][];
  rowCount: number;
}

/** A parsed test run (mirrors `orbit_core::testing::TestSummary`). */
export interface TestSummary {
  passed: number;
  failed: number;
  total: number;
  framework: string;
}

/** A document symbol for the Outline (mirrors `orbit_core::outline::Symbol`). */
export interface Symbol {
  name: string;
  kind: string;
  line: number;
}

/** A language-server diagnostic (mirrors `orbit_core::lsp::Diagnostic`). */
export interface LspDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  /** 1 error, 2 warning, 3 information, 4 hint. */
  severity: number;
  message: string;
  source?: string | null;
}

/** One HTTP response header (mirrors `orbit_core::http::Header`). */
export interface HttpHeader {
  name: string;
  value: string;
}

/** An HTTP response (mirrors `orbit_core::http::HttpResponse`). */
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: HttpHeader[];
  body: string;
  elapsedMs: number;
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

// --- Workspaces (mirrors `orbit_core::workspace`) ---------------------------

/** A saved terminal tab belonging to a project. */
export interface TerminalTab {
  id: string;
  title: string;
  shell: string;
  cwd: string;
}

/** A saved link — docs, dashboards, a staging URL. */
export interface Bookmark {
  id: string;
  label: string;
  url: string;
}

/** A pinned, runnable task for the project. */
export interface Task {
  id: string;
  name: string;
  command: string;
  favorite: boolean;
}

/** Everything Orbit remembers about a project. */
export interface Workspace {
  projectId: string;
  notes: string;
  terminals: TerminalTab[];
  bookmarks: Bookmark[];
  tasks: Task[];
  updatedAt: number;
}

// --- Files: explorer + editor (mirrors `orbit_core::files`) ------------------

/** One entry in a directory listing. */
export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  hidden: boolean;
  size: number;
  language?: string | null;
}

export type Encoding = "utf-8" | "utf-16-le" | "utf-16-be";
export type LineEnding = "lf" | "crlf" | "none";

/** A file loaded for the editor. */
export interface FileContents {
  text: string;
  language?: string | null;
  encoding: Encoding;
  lineEnding: LineEnding;
  binary: boolean;
  truncated: boolean;
  size: number;
}

// --- Search (mirrors `orbit_core::search`) ----------------------------------

/** One matching line within a file. */
export interface SearchMatch {
  /** 1-based line number. */
  line: number;
  /** 1-based character column of the first match on the line. */
  column: number;
  /** The line's text, trimmed for display. */
  text: string;
  /** Byte offset of the match within `text` (equal to `matchEnd` if off-screen). */
  matchStart: number;
  /** Byte offset just past the match within `text`. */
  matchEnd: number;
}

/** All matching lines within a single file. */
export interface FileMatches {
  path: string;
  name: string;
  language?: string | null;
  matches: SearchMatch[];
}

/** The outcome of a workspace search. */
export interface SearchResults {
  fileCount: number;
  matchCount: number;
  /** A cap was hit — more matches exist than were returned. */
  truncated: boolean;
  files: FileMatches[];
}

// --- Terminal (mirrors `orbit_core::shell` + src-tauri/terminal.rs) ----------

/** Which shell a session runs. */
export type ShellKind =
  | "power-shell"
  | "windows-power-shell"
  | "cmd"
  | "bash"
  | "zsh"
  | "fish"
  | "sh"
  | "nu"
  | "other";

/** A launchable shell detected on this machine. */
export interface Shell {
  label: string;
  program: string;
  args: string[];
  kind: ShellKind;
}

/** A chunk of output from a terminal session (`terminal:output` event). */
export interface TerminalOutput {
  id: string;
  data: string;
}

/** Emitted once when a session's shell exits (`terminal:exit` event). */
export interface TerminalExit {
  id: string;
  code?: number | null;
}

// --- Environment files (mirrors `orbit_core::env`) ---------------------------

/** The environment an `.env` file targets. */
export type EnvScope =
  | "default"
  | "local"
  | "development"
  | "production"
  | "test"
  | "example"
  | { other: string };

/** A single KEY=VALUE entry. `secret` means the UI should mask it. */
export interface EnvEntry {
  key: string;
  value: string;
  line: number;
  secret: boolean;
}

/** A parsed environment file. */
export interface EnvFile {
  path: string;
  scope: EnvScope;
  entries: EnvEntry[];
}

/** A problem worth surfacing: duplicate | missing | invalid-key | empty. */
export interface EnvIssue {
  kind: string;
  message: string;
  file: string;
  key?: string | null;
}

/** The full picture for a project's environment files. */
export interface EnvReport {
  files: EnvFile[];
  issues: EnvIssue[];
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
