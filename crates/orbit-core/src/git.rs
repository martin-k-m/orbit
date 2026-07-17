//! Git integration.
//!
//! Rather than link against libgit2 (a heavy native dependency that complicates
//! cross-compilation), Orbit shells out to the `git` binary the developer
//! already has. Every function degrades gracefully: a directory that isn't a
//! repository, or a machine without git, yields `Ok(None)` rather than an error.

use crate::error::Error;
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
    // `symbolic-ref` reads HEAD directly, so it names the branch even before the
    // first commit (an unborn branch), where `rev-parse --abbrev-ref` errors.
    if let Some(name) = run(dir, &["symbolic-ref", "--short", "-q", "HEAD"]) {
        let name = name.trim();
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }
    // Not a symbolic ref → detached HEAD; fall back to the short hash.
    run(dir, &["rev-parse", "--short", "HEAD"]).map(|h| format!("detached@{}", h.trim()))
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

// --- Source control (the git "power center") --------------------------------

/// One changed path in the working tree or index.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusEntry {
    /// Repo-relative path (forward slashes, as git reports under `-z`).
    pub path: String,
    /// The git status letter for this side (`M`, `A`, `D`, `R`, `C`, `U`, `?`).
    pub code: String,
    /// A human label for the letter, e.g. "Modified".
    pub label: String,
}

/// Staged vs. unstaged changes, the way a source-control panel groups them. A
/// file with both staged and unstaged edits appears in both lists.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    /// Current branch (or `detached@<hash>`).
    pub branch: String,
    /// Files with staged (index) changes.
    pub staged: Vec<StatusEntry>,
    /// Files with unstaged working-tree changes, plus untracked files.
    pub unstaged: Vec<StatusEntry>,
    /// Commits ahead of upstream.
    pub ahead: usize,
    /// Commits behind upstream.
    pub behind: usize,
}

fn label_for(code: char) -> &'static str {
    match code {
        'M' => "Modified",
        'A' => "Added",
        'D' => "Deleted",
        'R' => "Renamed",
        'C' => "Copied",
        'U' => "Conflicted",
        '?' => "Untracked",
        'T' => "Type changed",
        _ => "Changed",
    }
}

fn entry(code: char, path: &str) -> StatusEntry {
    StatusEntry {
        path: path.to_string(),
        code: code.to_string(),
        label: label_for(code).to_string(),
    }
}

/// Parse `git status --porcelain -z` into staged/unstaged groups.
fn parse_status(z: &str) -> (Vec<StatusEntry>, Vec<StatusEntry>) {
    let toks: Vec<&str> = z.split('\0').filter(|s| !s.is_empty()).collect();
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();

    let mut i = 0;
    while i < toks.len() {
        let tok = toks[i];
        if tok.len() < 3 {
            i += 1;
            continue;
        }
        let bytes = tok.as_bytes();
        let x = bytes[0] as char; // index (staged) status
        let y = bytes[1] as char; // work-tree (unstaged) status
        let path = &tok[3..];

        // A rename/copy carries its original path as the following NUL token.
        let step = if x == 'R' || x == 'C' || y == 'R' || y == 'C' {
            2
        } else {
            1
        };

        if x == '?' && y == '?' {
            unstaged.push(entry('?', path)); // untracked
        } else {
            if x != ' ' {
                staged.push(entry(x, path));
            }
            if y != ' ' {
                unstaged.push(entry(y, path));
            }
        }
        i += step;
    }
    (staged, unstaged)
}

/// A grouped status for the source-control panel, or `None` if not a repo.
pub fn status(dir: &Path) -> Option<GitStatus> {
    if !is_repo(dir) {
        return None;
    }
    let branch = current_branch(dir)?;
    let z = run(dir, &["status", "--porcelain", "-z"])?;
    let (staged, unstaged) = parse_status(&z);
    let (ahead, behind) = upstream_divergence(dir);
    Some(GitStatus {
        branch,
        staged,
        unstaged,
        ahead,
        behind,
    })
}

/// Run a git subcommand that mutates, mapping a non-zero exit to an [`Error`]
/// carrying git's own stderr so the UI can show why it failed.
fn run_ok(dir: &Path, args: &[&str]) -> crate::Result<String> {
    let describe = || format!("git {}", args.join(" "));
    let output = Command::new("git")
        .args(args)
        .current_dir(dir)
        .output()
        .map_err(|e| Error::Command {
            command: describe(),
            message: e.to_string(),
        })?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(Error::Command {
            command: describe(),
            message: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        })
    }
}

/// Stage a single path (`git add`).
pub fn stage(dir: &Path, path: &str) -> crate::Result<()> {
    run_ok(dir, &["add", "--", path]).map(|_| ())
}

/// Unstage a single path (`git restore --staged`).
pub fn unstage(dir: &Path, path: &str) -> crate::Result<()> {
    run_ok(dir, &["restore", "--staged", "--", path]).map(|_| ())
}

/// Stage every change (`git add -A`).
pub fn stage_all(dir: &Path) -> crate::Result<()> {
    run_ok(dir, &["add", "-A"]).map(|_| ())
}

/// Unstage everything (`git restore --staged .`).
pub fn unstage_all(dir: &Path) -> crate::Result<()> {
    run_ok(dir, &["restore", "--staged", "--", "."]).map(|_| ())
}

/// The unified diff for one path — staged (`--cached`) or working-tree.
pub fn diff(dir: &Path, path: &str, staged: bool) -> crate::Result<String> {
    if staged {
        run_ok(dir, &["diff", "--cached", "--", path])
    } else {
        run_ok(dir, &["diff", "--", path])
    }
}

/// Commit the staged changes with `message`, returning the new commit.
pub fn commit(dir: &Path, message: &str) -> crate::Result<Commit> {
    if message.trim().is_empty() {
        return Err(Error::Command {
            command: "git commit".into(),
            message: "a commit needs a message".into(),
        });
    }
    run_ok(dir, &["commit", "-m", message])?;
    last_commit(dir).ok_or_else(|| Error::Command {
        command: "git commit".into(),
        message: "committed, but the new commit could not be read back".into(),
    })
}

/// The most recent commits, newest first (empty if the repo has no history).
pub fn recent_commits(dir: &Path, limit: usize) -> Vec<Commit> {
    let arg = format!("-{limit}");
    let out = match run(
        dir,
        &["log", &arg, "--pretty=format:%H\x1f%h\x1f%an\x1f%at\x1f%s"],
    ) {
        Some(o) => o,
        None => return Vec::new(),
    };
    out.lines()
        .filter_map(|line| {
            let mut f = line.split('\x1f');
            Some(Commit {
                hash: f.next()?.to_string(),
                short_hash: f.next()?.to_string(),
                author: f.next()?.to_string(),
                timestamp: f.next()?.trim().parse().ok()?,
                summary: f.next().unwrap_or("").to_string(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn parse_status_groups_staged_unstaged_and_untracked() {
        // index=M worktree=' ' (staged only); ' 'M (unstaged only); MM (both);
        // ?? (untracked); a rename carries an extra NUL token for the old path.
        let z = "M  staged.rs\0 M work.rs\0MM both.rs\0?? new.rs\0R  new_name.rs\0old_name.rs\0";
        let (staged, unstaged) = parse_status(z);

        let sp: Vec<_> = staged.iter().map(|e| e.path.as_str()).collect();
        assert_eq!(sp, vec!["staged.rs", "both.rs", "new_name.rs"]);

        let up: Vec<_> = unstaged.iter().map(|e| e.path.as_str()).collect();
        assert_eq!(up, vec!["work.rs", "both.rs", "new.rs"]);

        // The untracked entry is labelled as such.
        let untracked = unstaged.iter().find(|e| e.path == "new.rs").unwrap();
        assert_eq!(untracked.code, "?");
        assert_eq!(untracked.label, "Untracked");
    }

    /// Init a throwaway repo with a deterministic identity so commits work in CI.
    fn init_repo() -> tempfile::TempDir {
        let tmp = tempfile::tempdir().unwrap();
        let d = tmp.path();
        run_ok(d, &["init", "-q"]).unwrap();
        run_ok(d, &["config", "user.email", "t@example.com"]).unwrap();
        run_ok(d, &["config", "user.name", "Test"]).unwrap();
        run_ok(d, &["config", "commit.gpgsign", "false"]).unwrap();
        tmp
    }

    #[test]
    fn stage_commit_diff_roundtrip() {
        let tmp = init_repo();
        let d = tmp.path();

        // A brand-new file shows up untracked.
        fs::write(d.join("a.txt"), "one\n").unwrap();
        let s = status(d).unwrap();
        assert!(s.staged.is_empty());
        assert_eq!(
            s.unstaged
                .iter()
                .map(|e| e.path.as_str())
                .collect::<Vec<_>>(),
            vec!["a.txt"]
        );
        assert_eq!(s.unstaged[0].code, "?");

        // Stage it → moves to the staged group.
        stage(d, "a.txt").unwrap();
        let s = status(d).unwrap();
        assert_eq!(
            s.staged.iter().map(|e| e.path.as_str()).collect::<Vec<_>>(),
            vec!["a.txt"]
        );
        assert!(s.unstaged.is_empty());

        // Commit → clean, and the commit reads back.
        let c = commit(d, "add a.txt").unwrap();
        assert_eq!(c.summary, "add a.txt");
        let s = status(d).unwrap();
        assert!(s.staged.is_empty() && s.unstaged.is_empty());
        assert_eq!(recent_commits(d, 10).len(), 1);

        // Modify → shows unstaged; the diff mentions the change.
        fs::write(d.join("a.txt"), "one\ntwo\n").unwrap();
        let s = status(d).unwrap();
        assert_eq!(s.unstaged[0].code, "M");
        let df = diff(d, "a.txt", false).unwrap();
        assert!(df.contains("+two"), "diff was: {df}");

        // Stage then unstage returns it to the working tree.
        stage(d, "a.txt").unwrap();
        assert_eq!(status(d).unwrap().staged.len(), 1);
        unstage(d, "a.txt").unwrap();
        assert_eq!(status(d).unwrap().staged.len(), 0);
    }

    #[test]
    fn commit_requires_message_and_staged_changes() {
        let tmp = init_repo();
        let d = tmp.path();
        assert!(commit(d, "   ").is_err(), "empty message must be rejected");
        // Nothing staged → git itself refuses.
        assert!(commit(d, "nothing here").is_err());
    }
}
