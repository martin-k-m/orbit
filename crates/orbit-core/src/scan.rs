//! Filesystem scanning: turn a folder the user selected into a set of
//! [`Project`]s Orbit can display and act on.

use crate::detect::{self, ROOT_MARKERS};
use crate::model::{Command, Language, Project};
use crate::profile;
use crate::Result;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Directories we never descend into — they hold build output and vendored
/// dependencies, never a project a developer manages by hand.
pub const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    ".git",
    "dist",
    "build",
    ".next",
    ".venv",
    "venv",
    "__pycache__",
    "vendor",
    ".cargo",
    ".turbo",
    "coverage",
];

/// Options controlling a scan.
#[derive(Debug, Clone)]
pub struct ScanOptions {
    /// How deep below the root to search for project markers.
    pub max_depth: usize,
    /// Whether to include hidden directories (those beginning with `.`).
    pub include_hidden: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        // Four levels covers `~/code/org/repo` style layouts without wandering
        // into deeply nested monorepo packages, which we treat as one project.
        ScanOptions {
            max_depth: 4,
            include_hidden: false,
        }
    }
}

/// Scan `root` for projects using the default options.
pub fn scan(root: impl AsRef<Path>) -> Result<Vec<Project>> {
    scan_with(root, &ScanOptions::default())
}

/// Scan `root` for projects, controlling depth and hidden-directory handling.
///
/// The walk stops descending as soon as it finds a project root, so a repo
/// with a `Cargo.toml` at the top is reported once, not once per crate.
pub fn scan_with(root: impl AsRef<Path>, options: &ScanOptions) -> Result<Vec<Project>> {
    let root = root.as_ref();
    if !root.is_dir() {
        return Err(crate::Error::InvalidPath(root.to_path_buf()));
    }

    let mut projects: BTreeMap<String, Project> = BTreeMap::new();
    let mut walker = WalkDir::new(root).max_depth(options.max_depth).into_iter();

    while let Some(entry) = walker.next() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        if !entry.file_type().is_dir() {
            continue;
        }
        let dir = entry.path();

        if entry.depth() > 0 && should_skip_dir(dir, options.include_hidden) {
            walker.skip_current_dir();
            continue;
        }

        if is_project_root(dir) {
            if let Some(project) = analyze(dir)? {
                projects.entry(project.id.clone()).or_insert(project);
            }
            // Don't descend into a project's own subfolders looking for more
            // projects — nested packages belong to the project we just found.
            walker.skip_current_dir();
        }
    }

    let mut out: Vec<Project> = projects.into_values().collect();
    out.sort_by_key(|p| p.name.to_lowercase());
    Ok(out)
}

/// Fully analyse a single directory as a project, if it is one.
///
/// Unlike [`scan`], this never walks children; it is the per-project unit of
/// work and is exposed so callers can re-analyse one project on demand.
pub fn analyze(dir: &Path) -> Result<Option<Project>> {
    let dir = dir.canonicalize().map_err(|e| crate::Error::io(dir, e))?;

    let ecosystems = detect::detect(&dir);
    if ecosystems.is_empty() {
        return Ok(None);
    }

    let profile = profile::load(&dir)?;

    let primary_language = pick_primary(&ecosystems);
    let name = profile
        .as_ref()
        .and_then(|p| p.name.clone())
        .unwrap_or_else(|| {
            dir.file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_else(|| "project".into())
        });

    // Merge commands: profile commands win over detected ones with the same name.
    let mut commands: BTreeMap<String, Command> = BTreeMap::new();
    for eco in &ecosystems {
        for command in &eco.commands {
            commands
                .entry(command.name.clone())
                .or_insert_with(|| command.clone());
        }
    }
    if let Some(p) = &profile {
        for command in &p.commands {
            commands.insert(command.name.clone(), command.clone());
        }
    }

    let dependency_count = ecosystems
        .iter()
        .map(|e| crate::deps::count(&dir, e.language))
        .sum();

    Ok(Some(Project {
        id: Project::id_for_path(&dir),
        name,
        primary_language,
        commands: commands.into_values().collect(),
        ecosystems,
        description: profile.and_then(|p| p.description),
        has_profile: profile_exists(&dir),
        dependency_count,
        path: dir,
    }))
}

fn pick_primary(ecosystems: &[crate::model::Ecosystem]) -> Language {
    // Prefer a "real" language over Docker, which is usually supporting infra.
    ecosystems
        .iter()
        .map(|e| e.language)
        .find(|l| *l != Language::Docker)
        .or_else(|| ecosystems.first().map(|e| e.language))
        .unwrap_or(Language::Unknown)
}

fn is_project_root(dir: &Path) -> bool {
    ROOT_MARKERS.iter().any(|marker| dir.join(marker).is_file())
}

fn profile_exists(dir: &Path) -> bool {
    dir.join(profile::PROFILE_FILE).is_file()
}

fn should_skip_dir(dir: &Path, include_hidden: bool) -> bool {
    let Some(name) = dir.file_name().and_then(|n| n.to_str()) else {
        return true;
    };
    if IGNORED_DIRS.contains(&name) {
        return true;
    }
    if !include_hidden && name.starts_with('.') {
        return true;
    }
    false
}

/// Convenience: absolute paths of every project root under `root`.
pub fn project_paths(root: impl AsRef<Path>) -> Result<Vec<PathBuf>> {
    Ok(scan(root)?.into_iter().map(|p| p.path).collect())
}
