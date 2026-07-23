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

/// Version operators a PEP 508 requirement may use, in no particular order —
/// [`split_requirement`] picks whichever appears *earliest in the string*.
const REQUIREMENT_OPS: [&str; 7] = ["==", ">=", "<=", "~=", "!=", ">", "<"];

fn split_requirement(line: &str) -> (String, String) {
    // Split at the earliest version operator *by position*. Looping over the
    // operators instead would mis-split a multi-constraint requirement such as
    // `django<5,>=4.2` at `>=`, leaving `django<5,` as the package name.
    let split = line
        .char_indices()
        .find(|(i, _)| REQUIREMENT_OPS.iter().any(|op| line[*i..].starts_with(op)))
        .map(|(i, _)| i);
    match split {
        Some(idx) => (
            line[..idx].trim().to_string(),
            line[idx..].trim().to_string(),
        ),
        // No operator at all: an unpinned requirement like `flask`.
        None => (line.trim().to_string(), "*".into()),
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    /// Write `contents` to `name` inside a fresh temp dir and hand back both,
    /// so each test gets an isolated project directory.
    fn project(name: &str, contents: &str) -> (tempfile::TempDir, PathBuf) {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::write(tmp.path().join(name), contents).unwrap();
        let path = tmp.path().to_path_buf();
        (tmp, path)
    }

    fn find<'a>(deps: &'a [Dependency], name: &str) -> &'a Dependency {
        deps.iter()
            .find(|d| d.name == name)
            .unwrap_or_else(|| panic!("no dependency named {name} in {deps:?}"))
    }

    #[test]
    fn rust_reads_both_sections_and_every_spec_shape() {
        let (_tmp, dir) = project(
            "Cargo.toml",
            r#"
[package]
name = "demo"

[dependencies]
serde = "1"
tokio = { version = "1.38", features = ["full"] }
orbit-core = { path = "../orbit-core" }
shared = { workspace = true }
patched = { git = "https://example.invalid/patched.git" }

[dev-dependencies]
tempfile = "3"
"#,
        );

        let deps = list(&dir, Language::Rust);
        assert_eq!(deps.len(), 6);
        assert_eq!(count(&dir, Language::Rust), 6);

        // A plain string is the version requirement verbatim.
        assert_eq!(find(&deps, "serde").current, "1");
        // A table's `version` key wins over anything else in the table.
        assert_eq!(find(&deps, "tokio").current, "1.38");
        // Tables without a version are labelled by how they resolve instead.
        assert_eq!(find(&deps, "orbit-core").current, "local");
        assert_eq!(find(&deps, "shared").current, "workspace");
        assert_eq!(find(&deps, "patched").current, "git");

        assert!(!find(&deps, "serde").dev);
        assert!(find(&deps, "tempfile").dev);
    }

    #[test]
    fn rust_without_a_manifest_or_with_a_broken_one_is_empty() {
        let empty = tempfile::tempdir().unwrap();
        assert!(list(empty.path(), Language::Rust).is_empty());

        let (_tmp, dir) = project("Cargo.toml", "[package\nname = broken");
        assert!(list(&dir, Language::Rust).is_empty());
    }

    #[test]
    fn node_separates_dependencies_from_dev_dependencies() {
        let (_tmp, dir) = project(
            "package.json",
            r#"{
              "name": "web",
              "dependencies": { "next": "14.2.5", "react": "^18.3.1" },
              "devDependencies": { "typescript": "5.5.4" }
            }"#,
        );

        let deps = list(&dir, Language::TypeScript);
        assert_eq!(deps.len(), 3);
        assert_eq!(find(&deps, "react").current, "^18.3.1");
        assert!(!find(&deps, "next").dev);
        assert!(find(&deps, "typescript").dev);
        // The caller's language is carried through, so a JS project is not
        // relabelled as TypeScript just because both share package.json.
        assert_eq!(find(&deps, "next").language, Language::TypeScript);
        assert_eq!(
            find(&list(&dir, Language::JavaScript), "next").language,
            Language::JavaScript
        );
    }

    #[test]
    fn python_prefers_requirements_txt_and_skips_comments_and_flags() {
        let (_tmp, dir) = project(
            "requirements.txt",
            "# runtime deps\nflask==3.0.3\nrequests>=2.31\nrich\n\n-r dev-requirements.txt\n--index-url https://example.invalid\n",
        );

        let deps = list(&dir, Language::Python);
        assert_eq!(deps.len(), 3);
        assert_eq!(find(&deps, "flask").current, "==3.0.3");
        assert_eq!(find(&deps, "requests").current, ">=2.31");
        // An unpinned requirement has no operator at all.
        assert_eq!(find(&deps, "rich").current, "*");
        assert!(deps.iter().all(|d| !d.dev));
    }

    #[test]
    fn python_splits_a_multi_constraint_requirement_at_the_first_operator() {
        // Regression: scanning the operator list rather than the string used to
        // split `django<5,>=4.2` at `>=`, yielding the name `django<5,`.
        assert_eq!(
            split_requirement("django<5,>=4.2"),
            ("django".into(), "<5,>=4.2".into())
        );
        assert_eq!(
            split_requirement("urllib3 != 2.0"),
            ("urllib3".into(), "!= 2.0".into())
        );
        assert_eq!(
            split_requirement("numpy~=1.26"),
            ("numpy".into(), "~=1.26".into())
        );
    }

    #[test]
    fn python_falls_back_to_pyproject_dependencies() {
        let (_tmp, dir) = project(
            "pyproject.toml",
            "[project]\nname = \"demo\"\ndependencies = [\"httpx>=0.27\", \"pydantic==2.8.2\"]\n",
        );

        let deps = list(&dir, Language::Python);
        assert_eq!(deps.len(), 2);
        assert_eq!(find(&deps, "httpx").current, ">=0.27");
        assert_eq!(find(&deps, "pydantic").current, "==2.8.2");
    }

    #[test]
    fn go_reads_single_line_and_block_requires() {
        let (_tmp, dir) = project(
            "go.mod",
            "module example.invalid/app\n\ngo 1.22\n\nrequire github.com/spf13/cobra v1.8.1\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.10.0\n\tgolang.org/x/sync v0.7.0 // indirect\n)\n",
        );

        let deps = list(&dir, Language::Go);
        assert_eq!(deps.len(), 3, "got {deps:?}");
        assert_eq!(find(&deps, "github.com/spf13/cobra").current, "v1.8.1");
        assert_eq!(find(&deps, "github.com/gin-gonic/gin").current, "v1.10.0");
        assert_eq!(find(&deps, "golang.org/x/sync").current, "v0.7.0");
        // `module` and `go` directives are not dependencies.
        assert!(deps
            .iter()
            .all(|d| d.name.contains('.') && d.name != "1.22"));
    }

    #[test]
    fn docker_and_unknown_ecosystems_declare_nothing() {
        let (_tmp, dir) = project(
            "docker-compose.yml",
            "services:\n  web:\n    image: nginx\n",
        );
        assert!(list(&dir, Language::Docker).is_empty());
        assert!(list(&dir, Language::Unknown).is_empty());
    }
}
