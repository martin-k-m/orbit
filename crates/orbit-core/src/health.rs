//! Project health analysis.
//!
//! A fast, local heuristic pass over a project that surfaces the things a
//! developer usually wants to fix: oversized source files, stray TODOs, large
//! committed artifacts and a missing test signal. It produces a 0–100 score so
//! projects can be compared at a glance, plus the concrete warnings behind it.

use crate::model::Project;
use crate::scan::IGNORED_DIRS;
use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;

/// The number of lines above which a source file is flagged as too large.
const LARGE_FILE_LINES: usize = 500;
/// The byte size above which any file is flagged as a heavy artifact.
const LARGE_FILE_BYTES: u64 = 5 * 1024 * 1024;

/// A single actionable finding from a health scan.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Warning {
    /// Machine-readable category, e.g. `large-file`, `todo`, `no-tests`.
    pub kind: String,
    /// Human-readable message.
    pub message: String,
    /// The file the warning relates to, relative to the project (if any).
    #[serde(default)]
    pub path: Option<String>,
    /// How much this finding weighs on the score, in points.
    pub penalty: u32,
}

/// The overall health report for a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthReport {
    /// Score from 0 (unhealthy) to 100 (pristine).
    pub score: u32,
    /// Number of source files considered.
    pub file_count: usize,
    /// Total lines of source counted.
    pub total_lines: usize,
    /// Count of TODO/FIXME/HACK markers found.
    pub todo_count: usize,
    /// The findings that reduced the score.
    pub warnings: Vec<Warning>,
}

impl HealthReport {
    /// A one-word grade derived from the score, for badges.
    pub fn grade(&self) -> &'static str {
        match self.score {
            90..=100 => "Excellent",
            75..=89 => "Good",
            60..=74 => "Fair",
            _ => "Needs work",
        }
    }
}

/// Run a health analysis on a project.
pub fn analyze(project: &Project) -> HealthReport {
    analyze_path(&project.path)
}

/// Run a health analysis on a directory directly.
pub fn analyze_path(root: &Path) -> HealthReport {
    let mut warnings = Vec::new();
    let mut file_count = 0usize;
    let mut total_lines = 0usize;
    let mut todo_count = 0usize;
    let mut saw_tests = false;

    for entry in WalkDir::new(root)
        .into_iter()
        // Never prune the root itself (its name is out of our control — e.g. a
        // temp dir beginning with a dot); only prune ignored *sub*directories.
        .filter_entry(|e| e.depth() == 0 || !is_ignored(e.path()))
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !entry.file_type().is_file() {
            continue;
        }

        // Flag heavy binary artifacts regardless of type.
        if let Ok(meta) = entry.metadata() {
            if meta.len() > LARGE_FILE_BYTES {
                warnings.push(Warning {
                    kind: "large-artifact".into(),
                    message: format!(
                        "{} is {:.1} MB — consider ignoring or storing it with LFS",
                        rel(root, path),
                        meta.len() as f64 / (1024.0 * 1024.0)
                    ),
                    path: Some(rel(root, path)),
                    penalty: 4,
                });
            }
        }

        if !is_source_file(path) {
            continue;
        }
        if is_test_file(path) {
            saw_tests = true;
        }

        let Ok(contents) = std::fs::read_to_string(path) else {
            continue;
        };
        file_count += 1;
        let lines = contents.lines().count();
        total_lines += lines;

        let todos = count_markers(&contents);
        todo_count += todos;

        if lines > LARGE_FILE_LINES {
            warnings.push(Warning {
                kind: "large-file".into(),
                message: format!("{} — {lines} lines", rel(root, path)),
                path: Some(rel(root, path)),
                penalty: file_penalty(lines),
            });
        }
    }

    if todo_count > 0 {
        warnings.push(Warning {
            kind: "todo".into(),
            message: format!("{todo_count} TODO/FIXME/HACK markers across the codebase"),
            path: None,
            penalty: (todo_count.min(10) as u32).saturating_mul(1),
        });
    }

    if file_count > 3 && !saw_tests {
        warnings.push(Warning {
            kind: "no-tests".into(),
            message: "No test files detected — Orbit found no `test`/`spec` sources".into(),
            path: None,
            penalty: 12,
        });
    }

    let penalty: u32 = warnings.iter().map(|w| w.penalty).sum();
    let score = 100u32.saturating_sub(penalty.min(100));

    // Present the worst offenders first.
    warnings.sort_by_key(|w| std::cmp::Reverse(w.penalty));

    HealthReport {
        score,
        file_count,
        total_lines,
        todo_count,
        warnings,
    }
}

fn file_penalty(lines: usize) -> u32 {
    // Gentle, capped penalty: big files hurt but never sink the score alone.
    (((lines.saturating_sub(LARGE_FILE_LINES)) / 250) as u32 + 3).min(10)
}

fn count_markers(contents: &str) -> usize {
    contents
        .lines()
        .filter(|line| line.contains("TODO") || line.contains("FIXME") || line.contains("HACK"))
        .count()
}

fn is_ignored(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|name| IGNORED_DIRS.contains(&name) || name.starts_with('.') && name.len() > 1)
        .unwrap_or(false)
}

fn is_source_file(path: &Path) -> bool {
    const EXTS: &[&str] = &[
        "rs", "ts", "tsx", "js", "jsx", "py", "go", "java", "kt", "rb", "c", "cc", "cpp", "h",
        "hpp", "cs", "swift", "php", "scala", "vue", "svelte",
    ];
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| EXTS.contains(&ext))
        .unwrap_or(false)
}

fn is_test_file(path: &Path) -> bool {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();
    let in_tests_dir = path.components().any(|c| {
        matches!(
            c.as_os_str().to_str(),
            Some("tests") | Some("test") | Some("__tests__") | Some("spec")
        )
    });
    in_tests_dir || name.contains("test") || name.contains("spec") || name.ends_with("_test.go")
}

fn rel(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}
