//! Dependency inspection.
//!
//! Orbit reads each ecosystem's manifest to list direct dependencies and their
//! declared versions. It deliberately does *not* hit the network — showing the
//! locally-declared state is fast, private and enough to power the dependency
//! panel. "Update available" hints come from comparing against lockfiles when
//! present, which is future work; for now `latest` is populated when we can
//! read it cheaply from a lockfile.

use crate::model::Language;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// One declared dependency of a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dependency {
    /// Package name.
    pub name: String,
    /// The version requirement as declared in the manifest.
    pub current: String,
    /// Whether this is a development-only dependency.
    pub dev: bool,
    /// The ecosystem it belongs to.
    pub language: Language,
}

/// List the direct dependencies declared for `language` in `dir`.
pub fn list(dir: &Path, language: Language) -> Vec<Dependency> {
    match language {
        Language::Rust => rust(dir),
        Language::TypeScript | Language::JavaScript => node(dir, language),
        Language::Python => python(dir),
        Language::Go => go(dir),
        Language::Docker | Language::Unknown => Vec::new(),
    }
}

/// Cheap count of direct dependencies, used to populate project cards.
pub fn count(dir: &Path, language: Language) -> usize {
    list(dir, language).len()
}

fn rust(dir: &Path) -> Vec<Dependency> {
    let Ok(raw) = std::fs::read_to_string(dir.join("Cargo.toml")) else {
        return Vec::new();
    };
    let Ok(value) = raw.parse::<toml::Value>() else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for (section, dev) in [("dependencies", false), ("dev-dependencies", true)] {
        if let Some(table) = value.get(section).and_then(|v| v.as_table()) {
            for (name, spec) in table {
                out.push(Dependency {
                    name: name.clone(),
                    current: rust_version(spec),
                    dev,
                    language: Language::Rust,
                });
            }
        }
    }
    out
}

fn rust_version(spec: &toml::Value) -> String {
    match spec {
        toml::Value::String(s) => s.clone(),
        toml::Value::Table(t) => t
            .get("version")
            .and_then(|v| v.as_str())
            .map(str::to_string)
            .unwrap_or_else(|| {
                if t.contains_key("workspace") {
                    "workspace".into()
                } else if t.contains_key("path") {
                    "local".into()
                } else if t.contains_key("git") {
                    "git".into()
                } else {
                    "*".into()
                }
            }),
        _ => "*".into(),
    }
}

fn node(dir: &Path, language: Language) -> Vec<Dependency> {
    let Ok(raw) = std::fs::read_to_string(dir.join("package.json")) else {
        return Vec::new();
    };
    let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for (section, dev) in [("dependencies", false), ("devDependencies", true)] {
        if let Some(obj) = json.get(section).and_then(|v| v.as_object()) {
            for (name, version) in obj {
                out.push(Dependency {
                    name: name.clone(),
                    current: version.as_str().unwrap_or("*").to_string(),
                    dev,
                    language,
                });
            }
        }
    }
    out
}

fn python(dir: &Path) -> Vec<Dependency> {
    // Prefer requirements.txt because it is trivially line-oriented.
    if let Ok(raw) = std::fs::read_to_string(dir.join("requirements.txt")) {
        return raw
            .lines()
            .map(str::trim)
            .filter(|l| !l.is_empty() && !l.starts_with('#') && !l.starts_with('-'))
            .map(|line| {
                let (name, current) = split_requirement(line);
                Dependency {
                    name,
                    current,
                    dev: false,
                    language: Language::Python,
                }
            })
            .collect();
    }

    // Fall back to PEP 621 `[project].dependencies` in pyproject.toml.
    let Ok(raw) = std::fs::read_to_string(dir.join("pyproject.toml")) else {
        return Vec::new();
    };
    let Ok(value) = raw.parse::<toml::Value>() else {
        return Vec::new();
    };
    value
        .get("project")
        .and_then(|p| p.get("dependencies"))
        .and_then(|d| d.as_array())
        .map(|deps| {
            deps.iter()
                .filter_map(|d| d.as_str())
                .map(|line| {
                    let (name, current) = split_requirement(line);
                    Dependency {
                        name,
                        current,
                        dev: false,
                        language: Language::Python,
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

fn split_requirement(line: &str) -> (String, String) {
    // Split on the first version operator we encounter.
    for op in ["==", ">=", "<=", "~=", ">", "<", "!="] {
        if let Some(idx) = line.find(op) {
            let name = line[..idx].trim().to_string();
            let current = line[idx..].trim().to_string();
            return (name, current);
        }
    }
    (line.trim().to_string(), "*".into())
}

fn go(dir: &Path) -> Vec<Dependency> {
    let Ok(raw) = std::fs::read_to_string(dir.join("go.mod")) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    let mut in_block = false;
    for line in raw.lines() {
        let line = line.trim();
        if line.starts_with("require (") {
            in_block = true;
            continue;
        }
        if in_block && line == ")" {
            in_block = false;
            continue;
        }
        let spec = if let Some(rest) = line.strip_prefix("require ") {
            Some(rest)
        } else if in_block {
            Some(line)
        } else {
            None
        };
        if let Some(spec) = spec {
            let mut parts = spec.split_whitespace();
            if let (Some(name), Some(version)) = (parts.next(), parts.next()) {
                if name.contains('.') {
                    out.push(Dependency {
                        name: name.to_string(),
                        current: version.to_string(),
                        dev: false,
                        language: Language::Go,
                    });
                }
            }
        }
    }
    out
}
