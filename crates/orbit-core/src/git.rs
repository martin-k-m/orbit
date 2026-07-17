//! Git integration.
//!
//! Rather than link against libgit2 (a heavy native dependency that complicates
//! cross-compilation), Orbit shells out to the `git` binary the developer
//! already has. Every function degrades gracefully: a directory that isn't a
//! repository, or a machine without git, yields `Ok(None)` rather than an error.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

/// A snapshot of a repository's state, as shown on a project card.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    /// Current branch, or a short commit hash when detached.
    pub branch: String,
    /// True when there are no uncommitted changes.
    pub is_clean: bool,
    /// Number of files with staged or unstaged changes.
    pub changed_files: usize,
    /// Commits ahead of the upstream branch.
    pub ahead: usize,
    /// Commits behind the upstream branch.
    pub behind: usize,
    /// The most recent commit, if the repo has any history.
    pub last_commit: Option<Commit>,
}

/// A single commit's summary.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    /// Full 40-char SHA.
    pub hash: String,
    /// Abbreviated SHA for display.
    pub short_hash: String,
    /// First line of the commit message.
    pub summary: String,
    /// Author name.
    pub author: String,
    /// Author date as a unix timestamp (seconds).
    pub timestamp: i64,
}

/// Read git information for `dir`, or `None` if it is not a git repository.
pub fn info(dir: &Path) -> Option<GitInfo> {
    if !is_repo(dir) {
        return None;
    }

    let branch = current_branch(dir)?;
    let (changed_files, is_clean) = working_tree_status(dir);
    let (ahead, behind) = upstream_divergence(dir);
    let last_commit = last_commit(dir);

    Some(GitInfo {
        branch,
        is_clean,
        changed_files,
        ahead,
        behind,
        last_commit,
    })
}

/// Whether `dir` is inside a git work tree.
pub fn is_repo(dir: &Path) -> bool {
    run(dir, &["rev-parse", "--is-inside-work-tree"])
        .map(|out| out.trim() == "true")
        .unwrap_or(false)
}

fn current_branch(dir: &Path) -> Option<String> {
    let branch = run(dir, &["rev-parse", "--abbrev-ref", "HEAD"])?;
    let branch = branch.trim();
    if branch == "HEAD" {
        // Detached HEAD — fall back to the short hash.
        run(dir, &["rev-parse", "--short", "HEAD"]).map(|h| format!("detached@{}", h.trim()))
    } else {
        Some(branch.to_string())
    }
}

fn working_tree_status(dir: &Path) -> (usize, bool) {
    match run(dir, &["status", "--porcelain"]) {
        Some(output) => {
            let count = output.lines().filter(|l| !l.trim().is_empty()).count();
            (count, count == 0)
        }
        None => (0, true),
    }
}

fn upstream_divergence(dir: &Path) -> (usize, usize) {
    // `left\tright` = behind\tahead relative to the upstream ref.
    match run(
        dir,
        &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
    ) {
        Some(output) => {
            let mut parts = output.split_whitespace();
            let ahead = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
            let behind = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
            (ahead, behind)
        }
        None => (0, 0),
    }
}

fn last_commit(dir: &Path) -> Option<Commit> {
    // Use an ASCII unit separator so commit messages with any punctuation parse.
    let output = run(
        dir,
        &["log", "-1", "--pretty=format:%H\x1f%h\x1f%an\x1f%at\x1f%s"],
    )?;
    let mut fields = output.split('\x1f');
    Some(Commit {
        hash: fields.next()?.to_string(),
        short_hash: fields.next()?.to_string(),
        author: fields.next()?.to_string(),
        timestamp: fields.next()?.trim().parse().ok()?,
        summary: fields.next().unwrap_or("").to_string(),
    })
}

/// Run a git subcommand in `dir`, returning stdout on success.
fn run(dir: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(dir)
        .output()
        .ok()?;
    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        None
    }
}
