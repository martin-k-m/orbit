//! Parsing test-runner output into a pass/fail summary.
//!
//! Orbit runs a project's existing `test` command (via [`crate::process`]) and
//! this module turns the captured output into counts the Testing panel can show
//! as badges. It recognises the common frameworks for Orbit's ecosystems —
//! `cargo test`, Jest/Vitest, and pytest — and returns `None` when it can't find
//! a summary line (the raw output is always shown regardless). Pure string work,
//! unit-tested.

use serde::{Deserialize, Serialize};

/// A parsed test run: counts plus which framework's format matched.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestSummary {
    pub passed: usize,
    pub failed: usize,
    pub total: usize,
    pub framework: String,
}

/// Parse test output into a summary, or `None` if no known format is found.
pub fn parse_summary(output: &str) -> Option<TestSummary> {
    // cargo prints one `test result:` line per test binary — sum them all.
    let cargo: Vec<&str> = output
        .lines()
        .filter(|l| l.contains("test result:"))
        .collect();
    if !cargo.is_empty() {
        let joined = cargo.join(" ");
        let passed = sum_before(&joined, "passed");
        let failed = sum_before(&joined, "failed");
        return Some(TestSummary {
            passed,
            failed,
            total: passed + failed,
            framework: "cargo".into(),
        });
    }

    // Jest / Vitest print a `Tests:`/`Tests ` line (not `Test Suites`/`Test Files`).
    if let Some(line) = output
        .lines()
        .map(str::trim)
        .find(|l| l.starts_with("Tests") && l.contains("passed"))
    {
        let passed = count_before(line, "passed").unwrap_or(0);
        let failed = count_before(line, "failed").unwrap_or(0);
        let total = count_before(line, "total").unwrap_or(passed + failed);
        return Some(TestSummary {
            passed,
            failed,
            total,
            framework: "jest".into(),
        });
    }

    // pytest's summary line: "5 passed, 1 failed in 0.12s".
    if let Some(line) = output
        .lines()
        .map(str::trim)
        .find(|l| l.contains("passed") && l.contains(" in "))
    {
        let passed = count_before(line, "passed").unwrap_or(0);
        let failed = count_before(line, "failed").unwrap_or(0);
        return Some(TestSummary {
            passed,
            failed,
            total: passed + failed,
            framework: "pytest".into(),
        });
    }

    None
}

/// Split into number/word tokens, dropping the common separators.
fn tokens(text: &str) -> Vec<&str> {
    text.split(|c: char| c.is_whitespace() || c == ',' || c == ';')
        .filter(|t| !t.is_empty())
        .collect()
}

/// The integer immediately before the first `keyword` token, if any.
fn count_before(text: &str, keyword: &str) -> Option<usize> {
    let toks = tokens(text);
    toks.iter()
        .enumerate()
        .find(|(i, t)| **t == keyword && *i > 0)
        .and_then(|(i, _)| toks[i - 1].parse().ok())
}

/// The sum of every integer that immediately precedes a `keyword` token.
fn sum_before(text: &str, keyword: &str) -> usize {
    let toks = tokens(text);
    toks.iter()
        .enumerate()
        .filter(|(i, t)| **t == keyword && *i > 0)
        .filter_map(|(i, _)| toks[i - 1].parse::<usize>().ok())
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_cargo_and_sums_binaries() {
        let out = "\
running 3 tests
test result: ok. 3 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out
running 2 tests
test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out";
        let s = parse_summary(out).unwrap();
        assert_eq!(s.framework, "cargo");
        assert_eq!(s.passed, 4);
        assert_eq!(s.failed, 1);
        assert_eq!(s.total, 5);
    }

    #[test]
    fn parses_jest_tests_line_not_suites() {
        let out = "\
Test Suites: 1 failed, 2 passed, 3 total
Tests:       2 failed, 10 passed, 12 total
Snapshots:   0 total";
        let s = parse_summary(out).unwrap();
        assert_eq!(s.framework, "jest");
        assert_eq!(s.passed, 10);
        assert_eq!(s.failed, 2);
        assert_eq!(s.total, 12);
    }

    #[test]
    fn parses_vitest_style_line() {
        let out = "Tests  10 passed (10)";
        let s = parse_summary(out).unwrap();
        assert_eq!(s.passed, 10);
        assert_eq!(s.failed, 0);
    }

    #[test]
    fn parses_pytest_summary() {
        let out = "===== 5 passed, 1 failed in 0.42s =====";
        let s = parse_summary(out).unwrap();
        assert_eq!(s.framework, "pytest");
        assert_eq!(s.passed, 5);
        assert_eq!(s.failed, 1);
    }

    #[test]
    fn none_when_no_summary() {
        assert!(parse_summary("just some build output\nnothing here").is_none());
    }
}
