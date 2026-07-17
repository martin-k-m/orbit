//! The Tauri command surface.
//!
//! Every function here is the backend half of a call the React UI makes with
//! `invoke("command_name", …)`. They are deliberately thin: parse arguments,
//! delegate to [`orbit_core`], and shape the result for the frontend. All
//! errors are returned as strings so they land in the JS promise's `catch`.

use crate::state::AppState;
use crate::terminal::Terminals;
use orbit_core::analytics::ActivityReport;
use orbit_core::deps::Dependency;
use orbit_core::env::EnvReport;
use orbit_core::git::GitInfo;
use orbit_core::health::HealthReport;
use orbit_core::model::{EcosystemLink, Language, Project};
use orbit_core::process::CommandOutput;
use orbit_core::store::StoredProject;
use orbit_core::workspace::Workspace;
use orbit_core::{deps, env, git, health, process, profile, scan, ProjectDetail};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::State;

/// A compact view of a project for dashboard cards — enough to render without
/// paying for a full detail hydration of every project.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    id: String,
    name: String,
    path: PathBuf,
    primary_language: Language,
    description: Option<String>,
    has_profile: bool,
    dependency_count: usize,
    ecosystem_link: Option<EcosystemLink>,
    command_count: usize,
    git_branch: Option<String>,
    git_clean: Option<bool>,
    changed_files: Option<usize>,
    last_opened: Option<i64>,
    pinned: bool,
}

impl ProjectSummary {
    fn from_project(project: Project, stored: Option<&StoredProject>) -> Self {
        let git = git::info(&project.path);
        ProjectSummary {
            id: project.id,
            name: project.name,
            primary_language: project.primary_language,
            description: project.description,
            has_profile: project.has_profile,
            dependency_count: project.dependency_count,
            ecosystem_link: project.ecosystem_link,
            command_count: project.commands.len(),
            git_branch: git.as_ref().map(|g| g.branch.clone()),
            git_clean: git.as_ref().map(|g| g.is_clean),
            changed_files: git.as_ref().map(|g| g.changed_files),
            last_opened: stored.and_then(|s| s.last_opened),
            pinned: stored.map(|s| s.pinned).unwrap_or(false),
            path: project.path,
        }
    }
}

fn now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn analyze(path: &Path) -> Result<Project, String> {
    scan::analyze(path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("{} is not a recognised project", path.display()))
}

/// Scan a folder the user picked and return every project found, without
/// persisting anything. Used by the "Add projects" flow to preview results.
#[tauri::command]
pub fn scan_folder(path: String) -> Result<Vec<ProjectSummary>, String> {
    let projects = scan::scan(&path).map_err(|e| e.to_string())?;
    Ok(projects
        .into_iter()
        .map(|p| ProjectSummary::from_project(p, None))
        .collect())
}

/// The projects the user has added to Orbit, hydrated with live git status.
#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectSummary>, String> {
    let stored = state.with_store(|store| store.projects().map_err(|e| e.to_string()))?;
    let mut out = Vec::with_capacity(stored.len());
    for record in &stored {
        // A folder may have been deleted or moved since it was added; skip it
        // rather than failing the whole list.
        if let Ok(Some(project)) = scan::analyze(&record.path) {
            out.push(ProjectSummary::from_project(project, Some(record)));
        }
    }
    Ok(out)
}

/// Add a project (or every project under a folder) to Orbit and remember it.
#[tauri::command]
pub fn add_project(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<ProjectSummary>, String> {
    let path = PathBuf::from(&path);
    // The path may be a single project or a parent folder of several.
    let projects = if scan::analyze(&path).map_err(|e| e.to_string())?.is_some() {
        vec![analyze(&path)?]
    } else {
        scan::scan(&path).map_err(|e| e.to_string())?
    };
    if projects.is_empty() {
        return Err("no projects found in that folder".to_string());
    }

    let added_at = now();
    state.with_store(|store| {
        for project in &projects {
            store
                .upsert_project(
                    &StoredProject {
                        id: project.id.clone(),
                        path: project.path.clone(),
                        name: project.name.clone(),
                        last_opened: None,
                        pinned: false,
                    },
                    added_at,
                )
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    })?;

    Ok(projects
        .into_iter()
        .map(|p| ProjectSummary::from_project(p, None))
        .collect())
}

/// Forget a project (does not touch the folder on disk).
#[tauri::command]
pub fn remove_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.with_store(|store| store.remove_project(&id).map_err(|e| e.to_string()))
}

/// Pin or unpin a project on the dashboard.
#[tauri::command]
pub fn set_pinned(state: State<'_, AppState>, id: String, pinned: bool) -> Result<(), String> {
    state.with_store(|store| store.set_pinned(&id, pinned).map_err(|e| e.to_string()))
}

/// Open a project: mark it as recently opened and return its full detail.
#[tauri::command]
pub fn open_project(
    state: State<'_, AppState>,
    id: String,
    path: String,
) -> Result<ProjectDetail, String> {
    let opened = now();
    // Touching is best-effort; a project opened before being "added" still works.
    let _ = state.with_store(|store| store.touch_project(&id, opened).map_err(|e| e.to_string()));
    project_detail(path)
}

/// The full detail view for a project directory.
#[tauri::command]
pub fn project_detail(path: String) -> Result<ProjectDetail, String> {
    orbit_core::project_detail(&path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("{path} is not a recognised project"))
}

/// A fresh health report for a project.
#[tauri::command]
pub fn project_health(path: String) -> Result<HealthReport, String> {
    Ok(health::analyze_path(Path::new(&path)))
}

/// The declared dependencies across every ecosystem in a project.
#[tauri::command]
pub fn project_deps(path: String) -> Result<Vec<Dependency>, String> {
    let project = analyze(Path::new(&path))?;
    Ok(project
        .ecosystems
        .iter()
        .flat_map(|eco| deps::list(&project.path, eco.language))
        .collect())
}

/// Git status for a project, or `null` if it is not a repository.
#[tauri::command]
pub fn git_info(path: String) -> Result<Option<GitInfo>, String> {
    Ok(git::info(Path::new(&path)))
}

/// Grouped staged/unstaged status for the source-control panel (`null` if the
/// project is not a git repository).
#[tauri::command]
pub fn git_status(path: String) -> Result<Option<git::GitStatus>, String> {
    Ok(git::status(Path::new(&path)))
}

/// Stage one path, or every change when `path` is null/empty.
#[tauri::command]
pub fn git_stage(path: String, file: Option<String>) -> Result<(), String> {
    let dir = Path::new(&path);
    match file.as_deref().filter(|f| !f.is_empty()) {
        Some(f) => git::stage(dir, f).map_err(|e| e.to_string()),
        None => git::stage_all(dir).map_err(|e| e.to_string()),
    }
}

/// Unstage one path, or everything when `path` is null/empty.
#[tauri::command]
pub fn git_unstage(path: String, file: Option<String>) -> Result<(), String> {
    let dir = Path::new(&path);
    match file.as_deref().filter(|f| !f.is_empty()) {
        Some(f) => git::unstage(dir, f).map_err(|e| e.to_string()),
        None => git::unstage_all(dir).map_err(|e| e.to_string()),
    }
}

/// The unified diff for a file, staged or unstaged.
#[tauri::command]
pub fn git_diff(path: String, file: String, staged: bool) -> Result<String, String> {
    git::diff(Path::new(&path), &file, staged).map_err(|e| e.to_string())
}

/// Commit the staged changes; returns the new commit.
#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<git::Commit, String> {
    git::commit(Path::new(&path), &message).map_err(|e| e.to_string())
}

/// The most recent commits (newest first).
#[tauri::command]
pub fn git_log(path: String, limit: usize) -> Result<Vec<git::Commit>, String> {
    Ok(git::recent_commits(Path::new(&path), limit))
}

/// Local branch names.
#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<String>, String> {
    Ok(git::branches(Path::new(&path)))
}

/// Switch to an existing branch.
#[tauri::command]
pub fn git_switch_branch(path: String, name: String) -> Result<(), String> {
    git::switch_branch(Path::new(&path), &name).map_err(|e| e.to_string())
}

/// Create a new branch off HEAD and switch to it.
#[tauri::command]
pub fn git_create_branch(path: String, name: String) -> Result<(), String> {
    git::create_branch(Path::new(&path), &name).map_err(|e| e.to_string())
}

/// Fetch remote-tracking refs.
#[tauri::command]
pub fn git_fetch(path: String) -> Result<(), String> {
    git::fetch(Path::new(&path)).map_err(|e| e.to_string())
}

/// Fast-forward pull from upstream.
#[tauri::command]
pub fn git_pull(path: String) -> Result<(), String> {
    git::pull(Path::new(&path)).map_err(|e| e.to_string())
}

/// Push the current branch to its upstream.
#[tauri::command]
pub fn git_push(path: String) -> Result<(), String> {
    git::push(Path::new(&path)).map_err(|e| e.to_string())
}

/// Assess how risky a project's command is before running it, so the UI can
/// show a confirmation dialog for anything destructive.
#[tauri::command]
pub fn assess_command(path: String, name: String) -> Result<orbit_core::Assessment, String> {
    let project = analyze(Path::new(&path))?;
    let command = project
        .commands
        .iter()
        .find(|c| c.name == name)
        .ok_or_else(|| format!("unknown command `{name}`"))?;
    Ok(orbit_core::assess(&command.program, &command.args))
}

/// Run one of a project's commands to completion and capture its output.
///
/// Suitable for builds and test runs. The frontend disables the button and
/// shows a spinner while this future is pending. Commands flagged as dangerous
/// by [`orbit_core::assess`] are refused unless the UI passes `confirmed: true`
/// after showing the user the risk.
#[tauri::command]
pub async fn run_command(
    path: String,
    name: String,
    confirmed: Option<bool>,
) -> Result<CommandOutput, String> {
    // Run on a blocking thread so we never stall Tauri's async runtime.
    tauri::async_runtime::spawn_blocking(move || {
        let project = analyze(Path::new(&path))?;
        let command = project
            .commands
            .iter()
            .find(|c| c.name == name)
            .ok_or_else(|| format!("unknown command `{name}`"))?;

        let assessment = orbit_core::assess(&command.program, &command.args);
        if assessment.risk.requires_confirmation() && confirmed != Some(true) {
            return Err(format!(
                "confirmation required: {}",
                assessment.reasons.join("; ")
            ));
        }

        process::run_to_completion(&project.path, command).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Generate a `.project-orbit` profile for a project, returning its path.
#[tauri::command]
pub fn generate_profile(path: String) -> Result<PathBuf, String> {
    let project = analyze(Path::new(&path))?;
    profile::write(&project.path, &project).map_err(|e| e.to_string())
}

/// The activity report for the last `days` days (defaults to 7).
#[tauri::command]
pub fn activity_report(
    state: State<'_, AppState>,
    days: Option<i64>,
) -> Result<ActivityReport, String> {
    let window = days.unwrap_or(7).max(1);
    let since = now() - window * 24 * 60 * 60;
    state.with_store(|store| {
        let sessions = store.sessions_since(since).map_err(|e| e.to_string())?;
        let builds = store.builds_since(since).map_err(|e| e.to_string())?;
        Ok(orbit_core::analytics::aggregate(&sessions, &builds))
    })
}

/// Read a persisted UI setting.
#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    state.with_store(|store| store.get_setting(&key).map_err(|e| e.to_string()))
}

/// Write a persisted UI setting.
#[tauri::command]
pub fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    state.with_store(|store| store.set_setting(&key, &value).map_err(|e| e.to_string()))
}

/// Open an interactive terminal in the project directory.
#[tauri::command]
pub fn open_terminal(path: String) -> Result<(), String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("{path} is not a directory"));
    }
    spawn_terminal(&dir).map_err(|e| e.to_string())
}

/// The engine/app version, surfaced in the About panel.
#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// --- Workspaces -----------------------------------------------------------

/// Load a project's workspace (terminals, tasks, bookmarks, notes).
///
/// A project that has never been opened gets an empty workspace seeded from its
/// detected commands, so the task list is useful immediately.
#[tauri::command]
pub fn get_workspace(
    state: State<'_, AppState>,
    id: String,
    path: String,
) -> Result<Workspace, String> {
    let mut workspace = state.with_store(|store| {
        store
            .workspace_or_default(&id)
            .map_err(|e| e.to_string())
    })?;

    // First open: seed tasks from whatever the scanner detected.
    if workspace.tasks.is_empty() {
        if let Ok(Some(project)) = scan::analyze(Path::new(&path)) {
            workspace.seed_tasks_from(&project);
        }
    }
    Ok(workspace)
}

/// Persist a project's workspace.
#[tauri::command]
pub fn save_workspace(state: State<'_, AppState>, workspace: Workspace) -> Result<(), String> {
    let now = now();
    state.with_store(|store| {
        store
            .save_workspace(&workspace, now)
            .map_err(|e| e.to_string())
    })
}

/// Run one of a workspace's user-defined tasks.
///
/// Like [`run_command`], destructive tasks are refused unless confirmed.
#[tauri::command]
pub async fn run_task(
    path: String,
    command_line: String,
    confirmed: Option<bool>,
) -> Result<CommandOutput, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = PathBuf::from(&path);
        if !dir.is_dir() {
            return Err(format!("{path} is not a directory"));
        }
        let command = orbit_core::model::Command::parse(
            "task",
            &command_line,
            orbit_core::model::CommandSource::Profile,
        )
        .ok_or_else(|| "empty command".to_string())?;

        let assessment = orbit_core::assess(&command.program, &command.args);
        if assessment.risk.requires_confirmation() && confirmed != Some(true) {
            return Err(format!(
                "confirmation required: {}",
                assessment.reasons.join("; ")
            ));
        }
        process::run_to_completion(&dir, &command).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

// --- Files (explorer + editor) --------------------------------------------

/// List the immediate children of a directory, for the file explorer tree.
/// Directories come first, then files, each sorted case-insensitively.
#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<orbit_core::files::FileNode>, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("{path} is not a directory"));
    }
    orbit_core::files::list_dir(&dir).map_err(|e| e.to_string())
}

/// Read a file for the editor: decoded text plus encoding, line ending,
/// language, and binary/truncated flags.
#[tauri::command]
pub fn read_file(path: String) -> Result<orbit_core::files::FileContents, String> {
    let file = PathBuf::from(&path);
    if !file.is_file() {
        return Err(format!("{path} is not a file"));
    }
    orbit_core::files::read_text_file(&file).map_err(|e| e.to_string())
}

/// Write text back to a file (the editor's save).
#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    let file = PathBuf::from(&path);
    // Refuse to create a file outside an existing directory — a save should
    // overwrite or write next to siblings, never conjure a tree.
    match file.parent() {
        Some(parent) if parent.is_dir() => {}
        _ => return Err(format!("{path} has no existing parent directory")),
    }
    std::fs::write(&file, contents).map_err(|e| e.to_string())
}

/// Search a project for a literal string ("find in files"). Skips ignored,
/// binary and oversized files; results are capped so a broad query stays cheap.
#[tauri::command]
pub fn search_workspace(
    root: String,
    query: String,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<orbit_core::search::SearchResults, String> {
    let dir = PathBuf::from(&root);
    if !dir.is_dir() {
        return Err(format!("{root} is not a directory"));
    }
    let query = orbit_core::search::Query {
        text: query,
        case_sensitive,
        whole_word,
    };
    orbit_core::search::search_workspace(&dir, &query).map_err(|e| e.to_string())
}

// --- Terminal -------------------------------------------------------------

/// The shells installed on this machine, best first. The first entry is what
/// Orbit opens by default.
#[tauri::command]
pub fn terminal_shells() -> Vec<orbit_core::shell::Shell> {
    orbit_core::shell::available()
}

/// Open a shell on a PTY in `path` and start streaming output.
///
/// Output arrives as `terminal:output` events; the shell exiting emits
/// `terminal:exit`.
#[tauri::command]
pub fn terminal_open(
    app: tauri::AppHandle,
    terminals: State<'_, Terminals>,
    path: String,
    shell: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    terminals.open(
        &app,
        Path::new(&path),
        shell,
        cols.unwrap_or(80),
        rows.unwrap_or(24),
    )
}

/// Send keystrokes to a terminal session.
#[tauri::command]
pub fn terminal_write(
    terminals: State<'_, Terminals>,
    id: String,
    data: String,
) -> Result<(), String> {
    terminals.write(&id, &data)
}

/// Tell a session its viewport changed size.
#[tauri::command]
pub fn terminal_resize(
    terminals: State<'_, Terminals>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    terminals.resize(&id, cols, rows)
}

/// Close a terminal session and kill its shell.
#[tauri::command]
pub fn terminal_close(terminals: State<'_, Terminals>, id: String) -> Result<(), String> {
    terminals.close(&id)
}

// --- Environment files ----------------------------------------------------

/// Report on a project's `.env` files: every file, plus duplicate, empty,
/// invalid and missing-vs-template variables. Secret values are flagged so the
/// UI can mask them.
#[tauri::command]
pub fn env_report(path: String) -> Result<EnvReport, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("{path} is not a directory"));
    }
    Ok(env::report(&dir))
}

/// Launch the platform's terminal emulator in `dir`.
fn spawn_terminal(dir: &Path) -> std::io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "cmd"])
            .current_dir(dir)
            .spawn()?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-a", "Terminal", "."])
            .current_dir(dir)
            .spawn()?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        // Try a couple of common emulators; fall back to $TERMINAL.
        let term = std::env::var("TERMINAL").unwrap_or_else(|_| "x-terminal-emulator".into());
        std::process::Command::new(term).current_dir(dir).spawn()?;
    }
    Ok(())
}
