//! Workspace content search — "find in files".
//!
//! A depth-first walk of a project that reads each text file once and reports
//! the lines matching a query. It reuses [`crate::scan::IGNORED_DIRS`] so it
//! never wastes time in `node_modules`, `target`, `.git` and friends, skips
//! files that look binary or are too large to be source, and caps its own
//! output so a broad query on a big repo can't blow up memory or the IPC
//! payload.
//!
//! Matching is literal (not regex) and ASCII-case-insensitive by default.
//! ASCII case folding is deliberate: it never changes a match's byte length, so
//! the offsets we hand back for highlighting stay exact. One [`Match`] is
//! reported per matching line (the first occurrence on that line), which is what
//! a results tree — file → lines — actually renders.
//!
//! Everything here is pure filesystem work: no `unsafe`, no network. It's
//! exercised through temp-dir tests.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::scan::IGNORED_DIRS;

/// What to search for, and how.
#[derive(Debug, Clone)]
pub struct Query {
    /// The literal text to find. An empty (after trim) query matches nothing.
    pub text: String,
    /// Match case exactly. Off by default (ASCII-case-insensitive).
    pub case_sensitive: bool,
    /// Require the match to be bounded by non-word characters, so `use` does
    /// not match `useState`. A "word character" is `[A-Za-z0-9_]`.
    pub whole_word: bool,
}

/// Limits that keep a search bounded on a large repository.
#[derive(Debug, Clone)]
pub struct SearchOptions {
    /// Files larger than this are skipped — source files are small; anything
    /// bigger is almost always generated or a blob.
    pub max_file_bytes: u64,
    /// Stop after this many matching lines across the whole search.
    pub max_results: usize,
    /// Stop collecting from a single file after this many matching lines.
    pub max_results_per_file: usize,
    /// Trim each reported line to this many characters, so a minified line
    /// can't bloat the payload.
    pub max_line_len: usize,
    /// Descend into hidden directories (those beginning with `.`).
    pub include_hidden: bool,
}

impl Default for SearchOptions {
    fn default() -> Self {
        SearchOptions {
            max_file_bytes: 2 * 1024 * 1024,
            max_results: 2_000,
            max_results_per_file: 200,
            max_line_len: 500,
            include_hidden: false,
        }
    }
}

/// One matching line within a file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Match {
    /// 1-based line number.
    pub line: usize,
    /// 1-based character column of the first match on this line.
    pub column: usize,
    /// The line's text, trimmed to [`SearchOptions::max_line_len`] characters.
    pub text: String,
    /// Byte offset of the first match within `text`, for highlighting. Equal to
    /// `match_end` when the match falls outside the trimmed text.
    pub match_start: usize,
    /// Byte offset just past the first match within `text`.
    pub match_end: usize,
}

/// All matching lines within a single file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMatches {
    /// Absolute path to the file.
    pub path: PathBuf,
    /// The file's name (not the full path).
    pub name: String,
    /// The editor language id, if recognised.
    pub language: Option<String>,
    /// The matching lines, in file order.
    pub matches: Vec<Match>,
}

/// The outcome of a workspace search.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    /// Number of files with at least one match.
    pub file_count: usize,
    /// Total matching lines across all files.
    pub match_count: usize,
    /// Whether a cap was hit, so more matches exist than were returned.
    pub truncated: bool,
    /// Per-file results, in walk order (directories before their files).
    pub files: Vec<FileMatches>,
}

/// Search `root` for `query` using the default options.
pub fn search_workspace(root: &Path, query: &Query) -> crate::Result<SearchResults> {
    search_with(root, query, &SearchOptions::default())
}

/// Search `root` for `query`, controlling the limits.
pub fn search_with(
    root: &Path,
    query: &Query,
    options: &SearchOptions,
) -> crate::Result<SearchResults> {
    let needle = query.text.trim();
    if needle.is_empty() {
        return Ok(SearchResults {
            file_count: 0,
            match_count: 0,
            truncated: false,
            files: Vec::new(),
        });
    }

    let mut files: Vec<FileMatches> = Vec::new();
    let mut match_count = 0usize;
    let mut truncated = false;

    let mut walker = WalkDir::new(root).into_iter();
    'walk: while let Some(entry) = walker.next() {
        let Ok(entry) = entry else { continue };
        let path = entry.path();

        if entry.file_type().is_dir() {
            // Never descend into build output / vendored deps / (optionally) dotdirs.
            if entry.depth() > 0 && should_skip_dir(path, options.include_hidden) {
                walker.skip_current_dir();
            }
            continue;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        // Size gate before reading anything.
        match entry.metadata() {
            Ok(m) if m.len() > options.max_file_bytes => continue,
            Ok(_) => {}
            Err(_) => continue,
        }

        let Some(text) = read_searchable(path, options.max_file_bytes as usize) else {
            continue; // unreadable or binary
        };

        let mut matches = Vec::new();
        for (i, raw_line) in text.lines().enumerate() {
            let Some((start, end)) = first_match(raw_line, needle, query) else {
                continue;
            };
            let column = raw_line[..start].chars().count() + 1;
            let (line_text, (m_start, m_end)) =
                trim_line(raw_line, start, end, options.max_line_len);
            matches.push(Match {
                line: i + 1,
                column,
                text: line_text,
                match_start: m_start,
                match_end: m_end,
            });
            match_count += 1;
            if matches.len() >= options.max_results_per_file {
                truncated = true;
                break;
            }
            if match_count >= options.max_results {
                truncated = true;
                break;
            }
        }

        if !matches.is_empty() {
            files.push(FileMatches {
                name: path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or_default()
                    .to_string(),
                language: crate::files::language_for(path),
                path: path.to_path_buf(),
                matches,
            });
        }

        if match_count >= options.max_results {
            truncated = true;
            break 'walk;
        }
    }

    Ok(SearchResults {
        file_count: files.len(),
        match_count,
        truncated,
        files,
    })
}

/// Whether to skip descending into `dir` — an ignored build/vendor directory,
/// or a hidden one when hidden directories aren't included.
fn should_skip_dir(dir: &Path, include_hidden: bool) -> bool {
    let Some(name) = dir.file_name().and_then(|n| n.to_str()) else {
        return false;
    };
    if IGNORED_DIRS.contains(&name) {
        return true;
    }
    !include_hidden && name.starts_with('.')
}

/// Read a file as searchable text, or `None` if it's unreadable or looks
/// binary. Reads at most `cap` bytes and decodes UTF-8 lossily — search treats
/// exotic encodings as out of scope rather than guessing.
fn read_searchable(path: &Path, cap: usize) -> Option<String> {
    use std::io::Read;
    let file = std::fs::File::open(path).ok()?;
    let mut buf = Vec::new();
    file.take(cap as u64).read_to_end(&mut buf).ok()?;
    // A NUL byte is the classic "this is binary" signal.
    if buf.contains(&0) {
        return None;
    }
    Some(String::from_utf8_lossy(&buf).into_owned())
}

/// Find the first occurrence of `needle` in `line`, honouring case sensitivity
/// and whole-word matching. Returns the match's byte range within `line`.
fn first_match(line: &str, needle: &str, query: &Query) -> Option<(usize, usize)> {
    let hay = line.as_bytes();
    let need = needle.as_bytes();
    if need.is_empty() || need.len() > hay.len() {
        return None;
    }
    let last = hay.len() - need.len();
    let mut i = 0;
    while i <= last {
        let window = &hay[i..i + need.len()];
        let hit = if query.case_sensitive {
            window == need
        } else {
            window.eq_ignore_ascii_case(need)
        };
        if hit && line.is_char_boundary(i) && line.is_char_boundary(i + need.len()) {
            let start = i;
            let end = i + need.len();
            if !query.whole_word || is_word_bounded(hay, start, end) {
                return Some((start, end));
            }
        }
        i += 1;
    }
    None
}

/// Whether the byte range `[start, end)` is bounded by non-word bytes on both
/// sides (or the string edge). A word byte is `[A-Za-z0-9_]`.
fn is_word_bounded(hay: &[u8], start: usize, end: usize) -> bool {
    let before_ok = start == 0 || !is_word_byte(hay[start - 1]);
    let after_ok = end >= hay.len() || !is_word_byte(hay[end]);
    before_ok && after_ok
}

fn is_word_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// Trim `line` to `max_chars` characters and translate a match's byte range
/// into the trimmed string. When the match lies past the trim point, the
/// returned range is empty (`start == end`), signalling "no highlight".
fn trim_line(line: &str, start: usize, end: usize, max_chars: usize) -> (String, (usize, usize)) {
    // Byte length of the first `max_chars` characters.
    let cut = line
        .char_indices()
        .nth(max_chars)
        .map(|(idx, _)| idx)
        .unwrap_or(line.len());
    if cut >= line.len() {
        return (line.to_string(), (start, end));
    }
    let trimmed = line[..cut].to_string();
    if end <= cut {
        (trimmed, (start, end))
    } else {
        // Match is beyond the visible slice — keep the line, drop the highlight.
        let anchor = trimmed.len();
        (trimmed, (anchor, anchor))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn q(text: &str) -> Query {
        Query {
            text: text.to_string(),
            case_sensitive: false,
            whole_word: false,
        }
    }

    #[test]
    fn empty_query_matches_nothing() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("a.txt"), "hello").unwrap();
        let res = search_workspace(tmp.path(), &q("   ")).unwrap();
        assert_eq!(res.match_count, 0);
        assert!(res.files.is_empty());
    }

    #[test]
    fn finds_matches_with_line_and_column() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(
            tmp.path().join("main.rs"),
            "fn main() {\n    let needle = 1;\n    other();\n}\n",
        )
        .unwrap();
        let res = search_workspace(tmp.path(), &q("needle")).unwrap();
        assert_eq!(res.file_count, 1);
        assert_eq!(res.match_count, 1);
        let f = &res.files[0];
        assert_eq!(f.name, "main.rs");
        assert_eq!(f.language.as_deref(), Some("rust"));
        let m = &f.matches[0];
        assert_eq!(m.line, 2);
        assert_eq!(m.column, 9); // "    let " is 8 chars, needle starts at 9
        assert_eq!(&m.text[m.match_start..m.match_end], "needle");
    }

    #[test]
    fn case_insensitive_by_default_and_sensitive_on_request() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("a.txt"), "Hello HELLO hello\n").unwrap();
        let insensitive = search_workspace(tmp.path(), &q("hello")).unwrap();
        // One Match per line (first occurrence), so a single line = one match.
        assert_eq!(insensitive.match_count, 1);
        assert_eq!(insensitive.files[0].matches[0].column, 1);

        let sensitive = search_with(
            tmp.path(),
            &Query {
                text: "HELLO".into(),
                case_sensitive: true,
                whole_word: false,
            },
            &SearchOptions::default(),
        )
        .unwrap();
        assert_eq!(sensitive.match_count, 1);
        // First (and only) case-exact hit starts at column 7.
        assert_eq!(sensitive.files[0].matches[0].column, 7);
    }

    #[test]
    fn whole_word_excludes_substrings() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(
            tmp.path().join("a.ts"),
            "import { useState } from 'react';\nuse(x);\n",
        )
        .unwrap();
        let loose = search_workspace(tmp.path(), &q("use")).unwrap();
        assert_eq!(loose.match_count, 2); // useState line + use(x) line

        let whole = search_with(
            tmp.path(),
            &Query {
                text: "use".into(),
                case_sensitive: false,
                whole_word: true,
            },
            &SearchOptions::default(),
        )
        .unwrap();
        assert_eq!(whole.match_count, 1); // only `use(x)`
        assert_eq!(whole.files[0].matches[0].line, 2);
    }

    #[test]
    fn skips_ignored_dirs_and_binary_and_large_files() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("keep.txt"), "target hit\n").unwrap();
        // Ignored directory — must not be searched.
        fs::create_dir_all(tmp.path().join("target")).unwrap();
        fs::write(tmp.path().join("target/gen.txt"), "target hit\n").unwrap();
        // Binary file — NUL byte means skip.
        fs::write(tmp.path().join("blob.bin"), b"target\0hit").unwrap();
        // Oversized file — skipped by the size gate.
        let big = format!("target hit\n{}", "x".repeat(3 * 1024 * 1024));
        fs::write(tmp.path().join("big.txt"), big).unwrap();

        let res = search_workspace(tmp.path(), &q("target")).unwrap();
        assert_eq!(res.file_count, 1, "only keep.txt should match");
        assert_eq!(res.files[0].name, "keep.txt");
    }

    #[test]
    fn respects_the_total_result_cap() {
        let tmp = tempfile::tempdir().unwrap();
        let body = "match\n".repeat(50);
        fs::write(tmp.path().join("a.txt"), &body).unwrap();
        let opts = SearchOptions {
            max_results: 10,
            ..SearchOptions::default()
        };
        let res = search_with(tmp.path(), &q("match"), &opts).unwrap();
        assert_eq!(res.match_count, 10);
        assert!(res.truncated);
    }

    #[test]
    fn trims_long_lines_but_keeps_early_matches() {
        let tmp = tempfile::tempdir().unwrap();
        let line = format!("needle{}", "x".repeat(1000));
        fs::write(tmp.path().join("min.js"), line).unwrap();
        let res = search_workspace(tmp.path(), &q("needle")).unwrap();
        let m = &res.files[0].matches[0];
        assert_eq!(m.text.chars().count(), 500);
        assert_eq!(&m.text[m.match_start..m.match_end], "needle");
    }
}
