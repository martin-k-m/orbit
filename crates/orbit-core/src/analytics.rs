//! Local, privacy-preserving developer analytics.
//!
//! Orbit records lightweight events — a coding session on a project, a build
//! that took N seconds — into the local database and aggregates them into the
//! "This Week" view. Nothing here ever leaves the machine; the types are pure
//! and the aggregation is deterministic so it is trivially testable.

use crate::model::Language;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// A single focused coding session on one project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    /// The project this session belonged to.
    pub project_id: String,
    /// Dominant language during the session.
    pub language: Language,
    /// Session start, unix seconds.
    pub started_at: i64,
    /// Session length in seconds.
    pub duration_secs: i64,
}

/// A recorded build and how long it took.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildRecord {
    /// The project built.
    pub project_id: String,
    /// When the build started, unix seconds.
    pub started_at: i64,
    /// Wall-clock build duration in milliseconds.
    pub duration_ms: i64,
    /// Whether the build succeeded.
    pub success: bool,
}

/// Time spent in a single language over the reporting window.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageStat {
    /// The language.
    pub language: Language,
    /// Total seconds spent.
    pub seconds: i64,
}

impl LanguageStat {
    /// Whole hours, for display.
    pub fn hours(&self) -> f64 {
        self.seconds as f64 / 3600.0
    }
}

/// An aggregated report over a window of activity.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityReport {
    /// Total focused seconds across all projects.
    pub total_seconds: i64,
    /// Number of distinct projects touched.
    pub projects_touched: usize,
    /// Number of sessions.
    pub session_count: usize,
    /// Per-language breakdown, sorted by time descending.
    pub languages: Vec<LanguageStat>,
    /// Median build time in milliseconds, if any builds were recorded.
    pub median_build_ms: Option<i64>,
}

/// Aggregate raw sessions and builds into an [`ActivityReport`].
///
/// `sessions` and `builds` are typically the rows returned from the store for a
/// time window; the caller decides the window, this function just folds.
pub fn aggregate(sessions: &[Session], builds: &[BuildRecord]) -> ActivityReport {
    let mut by_language: BTreeMap<Language, i64> = BTreeMap::new();
    let mut projects = std::collections::BTreeSet::new();
    let mut total = 0i64;

    for session in sessions {
        *by_language.entry(session.language).or_default() += session.duration_secs;
        projects.insert(session.project_id.clone());
        total += session.duration_secs;
    }

    let mut languages: Vec<LanguageStat> = by_language
        .into_iter()
        .map(|(language, seconds)| LanguageStat { language, seconds })
        .collect();
    languages.sort_by_key(|stat| std::cmp::Reverse(stat.seconds));

    ActivityReport {
        total_seconds: total,
        projects_touched: projects.len(),
        session_count: sessions.len(),
        languages,
        median_build_ms: median_build(builds),
    }
}

fn median_build(builds: &[BuildRecord]) -> Option<i64> {
    if builds.is_empty() {
        return None;
    }
    let mut times: Vec<i64> = builds.iter().map(|b| b.duration_ms).collect();
    times.sort_unstable();
    let mid = times.len() / 2;
    Some(if times.len() % 2 == 0 {
        (times[mid - 1] + times[mid]) / 2
    } else {
        times[mid]
    })
}
