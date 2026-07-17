//! Environment file management.
//!
//! Replaces `.env` chaos: discover every environment file in a project, parse
//! it, and report the things that actually bite — duplicate keys, variables
//! defined in one environment but missing from another, malformed keys, and
//! values that look like secrets and should be masked in the UI.
//!
//! Parsing follows common dotenv semantics: `KEY=VALUE`, an optional `export `
//! prefix, `#` comments, and single/double quoted values (where a `#` inside
//! quotes is literal, not a comment).
//!
//! Nothing here touches the network, and values are never logged — the desktop
//! app masks anything [`is_secret`] flags.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

/// The environment an `.env` file targets, inferred from its filename.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Scope {
    /// `.env` — the base file.
    Default,
    /// `.env.local` — machine-local overrides (usually git-ignored).
    Local,
    /// `.env.development`
    Development,
    /// `.env.production`
    Production,
    /// `.env.test`
    Test,
    /// `.env.example` / `.env.sample` — the committed template.
    Example,
    /// Anything else, e.g. `.env.staging`.
    Other(String),
}

impl Scope {
    /// Infer the scope from a filename such as `.env.production`.
    pub fn from_file_name(name: &str) -> Option<Self> {
        if name == ".env" {
            return Some(Scope::Default);
        }
        let suffix = name.strip_prefix(".env.")?;
        Some(match suffix {
            "local" => Scope::Local,
            "development" | "dev" => Scope::Development,
            "production" | "prod" => Scope::Production,
            "test" => Scope::Test,
            "example" | "sample" | "template" => Scope::Example,
            other => Scope::Other(other.to_string()),
        })
    }

    /// A human label for the UI.
    pub fn label(&self) -> String {
        match self {
            Scope::Default => "default".into(),
            Scope::Local => "local".into(),
            Scope::Development => "development".into(),
            Scope::Production => "production".into(),
            Scope::Test => "test".into(),
            Scope::Example => "example".into(),
            Scope::Other(name) => name.clone(),
        }
    }

    /// Whether this file is a committed template rather than real values.
    pub fn is_template(&self) -> bool {
        matches!(self, Scope::Example)
    }
}

/// A single `KEY=VALUE` entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    /// The variable name.
    pub key: String,
    /// The parsed value (quotes stripped).
    pub value: String,
    /// 1-based line number in the file.
    pub line: usize,
    /// Whether the name suggests a secret and the UI should mask it.
    pub secret: bool,
}

impl Entry {
    /// The value with all but the last few characters replaced, for display.
    pub fn masked(&self) -> String {
        mask(&self.value)
    }
}

/// A parsed environment file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvFile {
    /// Absolute path on disk.
    pub path: PathBuf,
    /// The environment this file targets.
    pub scope: Scope,
    /// Every entry, in file order.
    pub entries: Vec<Entry>,
}

impl EnvFile {
    /// The keys defined in this file, de-duplicated and sorted.
    pub fn keys(&self) -> Vec<&str> {
        let mut keys: Vec<&str> = self.entries.iter().map(|e| e.key.as_str()).collect();
        keys.sort_unstable();
        keys.dedup();
        keys
    }
}

/// A problem worth surfacing in the UI.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    /// Machine-readable category: `duplicate`, `missing`, `invalid-key`, `empty`.
    pub kind: String,
    /// Human-readable message.
    pub message: String,
    /// The file the issue belongs to, relative to the project.
    pub file: String,
    /// The variable involved, when applicable.
    #[serde(default)]
    pub key: Option<String>,
}

/// The full picture for a project's environment files.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvReport {
    /// Every environment file found, sorted by scope.
    pub files: Vec<EnvFile>,
    /// Everything worth fixing.
    pub issues: Vec<Issue>,
}

impl EnvReport {
    /// Whether anything needs attention.
    pub fn is_clean(&self) -> bool {
        self.issues.is_empty()
    }
}

/// The filenames we look for, in priority order.
const CANDIDATES: &[&str] = &[
    ".env",
    ".env.local",
    ".env.development",
    ".env.dev",
    ".env.production",
    ".env.prod",
    ".env.test",
    ".env.example",
    ".env.sample",
    ".env.template",
];

/// Key fragments that mark a value as a secret.
const SECRET_HINTS: &[&str] = &[
    "SECRET",
    "TOKEN",
    "PASSWORD",
    "PASSWD",
    "APIKEY",
    "API_KEY",
    "PRIVATE",
    "CREDENTIAL",
    "AUTH",
    "SESSION",
    "SIGNING",
    "CERT",
    "DSN",
    "ACCESS_KEY",
    "CLIENT_SECRET",
];

/// Whether a variable name looks like it holds a secret.
pub fn is_secret(key: &str) -> bool {
    let upper = key.to_uppercase();
    // `..._KEY` is a secret, but a bare `KEY_PREFIX` style name usually isn't.
    SECRET_HINTS.iter().any(|hint| upper.contains(hint)) || upper.ends_with("_KEY")
}

/// Mask a value for display, keeping a short suffix for recognisability.
pub fn mask(value: &str) -> String {
    let len = value.chars().count();
    if len == 0 {
        return String::new();
    }
    if len <= 4 {
        return "•".repeat(len);
    }
    let tail: String = value.chars().skip(len - 2).collect();
    format!("{}{}", "•".repeat(len - 2), tail)
}

/// Whether a key is a valid POSIX-ish environment variable name.
fn is_valid_key(key: &str) -> bool {
    let mut chars = key.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Parse the contents of an environment file.
///
/// Invalid or unparseable lines are skipped; use [`report`] to surface them.
pub fn parse(contents: &str) -> Vec<Entry> {
    let mut entries = Vec::new();
    for (index, raw) in contents.lines().enumerate() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let line = line.strip_prefix("export ").unwrap_or(line);
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim().to_string();
        if key.is_empty() {
            continue;
        }
        entries.push(Entry {
            secret: is_secret(&key),
            key,
            value: parse_value(value.trim()),
            line: index + 1,
        });
    }
    entries
}

/// Strip quotes and trailing comments from a raw value.
fn parse_value(raw: &str) -> String {
    // Quoted values are taken literally up to the closing quote; a `#` inside
    // them is part of the value, not a comment.
    for quote in ['"', '\''] {
        if let Some(rest) = raw.strip_prefix(quote) {
            if let Some(end) = rest.find(quote) {
                return rest[..end].to_string();
            }
            return rest.to_string();
        }
    }
    // Unquoted: a ` #` begins a trailing comment.
    let value = match raw.find(" #") {
        Some(idx) => &raw[..idx],
        None => raw,
    };
    value.trim().to_string()
}

/// Load a single environment file from disk.
pub fn load(path: &Path) -> Option<EnvFile> {
    let name = path.file_name()?.to_str()?;
    let scope = Scope::from_file_name(name)?;
    let contents = std::fs::read_to_string(path).ok()?;
    Some(EnvFile {
        entries: parse(&contents),
        path: path.to_path_buf(),
        scope,
    })
}

/// Discover every environment file directly inside `dir`.
pub fn discover(dir: &Path) -> Vec<EnvFile> {
    let mut files: Vec<EnvFile> = CANDIDATES
        .iter()
        .map(|name| dir.join(name))
        .filter(|path| path.is_file())
        .filter_map(|path| load(&path))
        .collect();
    files.sort_by(|a, b| a.scope.cmp(&b.scope));
    files
}

/// Build a full report for a project directory: every file plus every issue.
///
/// Issues detected:
/// - `duplicate` — the same key defined twice in one file (last one wins).
/// - `invalid-key` — a name that isn't a valid environment variable.
/// - `empty` — a key with no value.
/// - `missing` — a key present in the `.env.example` template but absent from a
///   real environment file.
pub fn report(dir: &Path) -> EnvReport {
    let files = discover(dir);
    let mut issues = Vec::new();

    for file in &files {
        let rel = rel_name(dir, &file.path);

        // Duplicates within the file.
        let mut seen: BTreeMap<&str, usize> = BTreeMap::new();
        for entry in &file.entries {
            if let Some(first) = seen.get(entry.key.as_str()) {
                issues.push(Issue {
                    kind: "duplicate".into(),
                    message: format!(
                        "`{}` is defined twice (lines {} and {}) — the last value wins",
                        entry.key, first, entry.line
                    ),
                    file: rel.clone(),
                    key: Some(entry.key.clone()),
                });
            } else {
                seen.insert(entry.key.as_str(), entry.line);
            }

            if !is_valid_key(&entry.key) {
                issues.push(Issue {
                    kind: "invalid-key".into(),
                    message: format!("`{}` is not a valid environment variable name", entry.key),
                    file: rel.clone(),
                    key: Some(entry.key.clone()),
                });
            }

            if entry.value.is_empty() && !file.scope.is_template() {
                issues.push(Issue {
                    kind: "empty".into(),
                    message: format!("`{}` has no value", entry.key),
                    file: rel.clone(),
                    key: Some(entry.key.clone()),
                });
            }
        }
    }

    // Keys promised by the template but missing from real environments.
    if let Some(template) = files.iter().find(|f| f.scope.is_template()) {
        for file in files.iter().filter(|f| !f.scope.is_template()) {
            let defined = file.keys();
            for key in template.keys() {
                if !defined.contains(&key) {
                    issues.push(Issue {
                        kind: "missing".into(),
                        message: format!(
                            "`{key}` is in {} but missing here",
                            rel_name(dir, &template.path)
                        ),
                        file: rel_name(dir, &file.path),
                        key: Some(key.to_string()),
                    });
                }
            }
        }
    }

    EnvReport { files, issues }
}

fn rel_name(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn write(dir: &Path, name: &str, contents: &str) {
        fs::write(dir.join(name), contents).unwrap();
    }

    #[test]
    fn parses_common_dotenv_syntax() {
        let entries = parse(
            r#"
# a comment
DATABASE_URL=postgres://localhost/app
export API_TOKEN="abc123"
QUOTED='single quoted'
WITH_COMMENT=value # trailing comment
HASH_IN_QUOTES="a#b"
EQUALS_IN_VALUE=key=value
EMPTY=
"#,
        );
        let get = |k: &str| entries.iter().find(|e| e.key == k).unwrap();
        assert_eq!(get("DATABASE_URL").value, "postgres://localhost/app");
        assert_eq!(get("API_TOKEN").value, "abc123");
        assert_eq!(get("QUOTED").value, "single quoted");
        assert_eq!(get("WITH_COMMENT").value, "value");
        assert_eq!(get("HASH_IN_QUOTES").value, "a#b");
        assert_eq!(get("EQUALS_IN_VALUE").value, "key=value");
        assert_eq!(get("EMPTY").value, "");
        // Comments and blank lines are not entries — 7 real assignments.
        assert_eq!(entries.len(), 7);
    }

    #[test]
    fn flags_secret_looking_keys() {
        assert!(is_secret("API_TOKEN"));
        assert!(is_secret("DATABASE_PASSWORD"));
        assert!(is_secret("STRIPE_SECRET_KEY"));
        assert!(is_secret("AWS_ACCESS_KEY_ID"));
        assert!(is_secret("SESSION_SECRET"));
        assert!(!is_secret("PORT"));
        assert!(!is_secret("NODE_ENV"));
        assert!(!is_secret("HOST"));
    }

    #[test]
    fn masks_values_keeping_a_short_tail() {
        assert_eq!(mask(""), "");
        assert_eq!(mask("ab"), "••");
        assert_eq!(mask("secret"), "••••et");
        assert_eq!(mask("abcdef").chars().count(), 6);
    }

    #[test]
    fn infers_scope_from_file_name() {
        assert_eq!(Scope::from_file_name(".env"), Some(Scope::Default));
        assert_eq!(Scope::from_file_name(".env.local"), Some(Scope::Local));
        assert_eq!(
            Scope::from_file_name(".env.production"),
            Some(Scope::Production)
        );
        assert_eq!(Scope::from_file_name(".env.example"), Some(Scope::Example));
        assert_eq!(
            Scope::from_file_name(".env.staging"),
            Some(Scope::Other("staging".into()))
        );
        assert_eq!(Scope::from_file_name("package.json"), None);
    }

    #[test]
    fn discovers_and_orders_files() {
        let tmp = tempfile::tempdir().unwrap();
        write(tmp.path(), ".env", "A=1\n");
        write(tmp.path(), ".env.production", "A=2\n");
        write(tmp.path(), ".env.example", "A=\n");
        let files = discover(tmp.path());
        assert_eq!(files.len(), 3);
        // Default sorts before Production, which sorts before Example.
        assert_eq!(files[0].scope, Scope::Default);
        assert_eq!(files[1].scope, Scope::Production);
        assert_eq!(files[2].scope, Scope::Example);
    }

    #[test]
    fn reports_duplicates_and_empty_values() {
        let tmp = tempfile::tempdir().unwrap();
        write(tmp.path(), ".env", "PORT=3000\nPORT=4000\nHOST=\n");
        let report = report(tmp.path());
        assert!(!report.is_clean());
        assert!(report
            .issues
            .iter()
            .any(|i| i.kind == "duplicate" && i.key.as_deref() == Some("PORT")));
        assert!(report
            .issues
            .iter()
            .any(|i| i.kind == "empty" && i.key.as_deref() == Some("HOST")));
    }

    #[test]
    fn reports_keys_missing_against_the_template() {
        let tmp = tempfile::tempdir().unwrap();
        write(
            tmp.path(),
            ".env.example",
            "PORT=\nDATABASE_URL=\nAPI_TOKEN=\n",
        );
        write(tmp.path(), ".env", "PORT=3000\n");
        let report = report(tmp.path());
        let missing: Vec<_> = report
            .issues
            .iter()
            .filter(|i| i.kind == "missing")
            .filter_map(|i| i.key.clone())
            .collect();
        assert!(missing.contains(&"DATABASE_URL".to_string()));
        assert!(missing.contains(&"API_TOKEN".to_string()));
        assert!(!missing.contains(&"PORT".to_string()));
    }

    #[test]
    fn template_empty_values_are_not_flagged() {
        let tmp = tempfile::tempdir().unwrap();
        write(tmp.path(), ".env.example", "PORT=\n");
        let report = report(tmp.path());
        // An example file is expected to have blank values.
        assert!(!report.issues.iter().any(|i| i.kind == "empty"));
    }

    #[test]
    fn a_clean_project_reports_nothing() {
        let tmp = tempfile::tempdir().unwrap();
        write(tmp.path(), ".env", "PORT=3000\nNODE_ENV=development\n");
        assert!(report(tmp.path()).is_clean());
    }
}
