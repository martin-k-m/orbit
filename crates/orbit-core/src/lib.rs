//! # orbit-core
//!
//! The engine behind Orbit, a local-first developer command center.
//!
//! `orbit-core` is a pure Rust library with no server, no telemetry and no
//! network access on its hot paths. It knows how to:
//!
//! - **scan** folders and [detect] the projects inside them ([`scan`]),
//! - read and write project [`profile`]s (`.project-orbit`),
//! - report [`git`] status,
//! - run project [`process`]es,
//! - inspect [`deps`]endencies,
//! - grade project [`health`],
//! - aggregate local [`analytics`],
//! - and remember everything in a local SQLite [`store`].
//!
//! Both the desktop app (`orbit-desktop`) and the terminal companion
//! (`orbit-cli`) are thin shells over this crate, which keeps behaviour
//! identical across surfaces and makes the interesting logic unit-testable
//! without a UI.
//!
//! ```no_run
//! use orbit_core::scan;
//!
//! let projects = scan::scan("~/code").unwrap_or_default();
//! for project in &projects {
//!     println!("{} ({})", project.name, project.primary_language.label());
//! }
//! ```

pub mod analytics;
pub mod deps;
pub mod detect;
pub mod env;
pub mod error;
pub mod files;
pub mod git;
pub mod health;
pub mod model;
pub mod process;
pub mod profile;
pub mod safety;
pub mod scan;
pub mod shell;
pub mod workspace;

#[cfg(feature = "persistence")]
pub mod store;

pub use error::{Error, Result};
pub use model::{Command, CommandSource, Ecosystem, EcosystemLink, Language, Project};
pub use safety::{assess, Assessment, Risk};

/// The current engine version, sourced from `Cargo.toml`.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// A convenience bundle describing a project plus its live git and health
/// state — the shape the desktop app hydrates a project detail view from.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetail {
    /// The scanned project.
    pub project: Project,
    /// Git status, if the project is a repository.
    pub git: Option<git::GitInfo>,
    /// A fresh health report.
    pub health: health::HealthReport,
    /// Declared dependencies across every ecosystem in the project.
    pub dependencies: Vec<deps::Dependency>,
}

/// Build a [`ProjectDetail`] for a project on disk in one call.
///
/// This is the single entry point the app uses when a user opens a project: it
/// re-analyses the folder, layers on git and health, and lists dependencies.
pub fn project_detail(path: impl AsRef<std::path::Path>) -> Result<Option<ProjectDetail>> {
    let path = path.as_ref();
    let Some(project) = scan::analyze(path)? else {
        return Ok(None);
    };

    let git = git::info(&project.path);
    let health = health::analyze(&project);
    let dependencies = project
        .ecosystems
        .iter()
        .flat_map(|eco| deps::list(&project.path, eco.language))
        .collect();

    Ok(Some(ProjectDetail {
        project,
        git,
        health,
        dependencies,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    fn write(dir: &Path, name: &str, contents: &str) {
        let path = dir.join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, contents).unwrap();
    }

    /// Every type returned by a Tauri command handler must be `Serialize`, or
    /// `tauri::generate_handler!` fails to compile with a confusing
    /// `async_kind`/E0599 error. The desktop crate lives outside this workspace
    /// (it needs the platform webview stack), so this guard catches the mistake
    /// in a plain `cargo test` instead of only in a CI bundle job.
    #[test]
    fn ipc_types_are_serializable() {
        fn assert_serialize<T: serde::Serialize>() {}
        fn assert_deserialize<T: serde::de::DeserializeOwned>() {}

        assert_serialize::<Project>();
        assert_serialize::<Command>();
        assert_serialize::<Ecosystem>();
        assert_serialize::<ProjectDetail>();
        assert_serialize::<git::GitInfo>();
        assert_serialize::<git::Commit>();
        assert_serialize::<health::HealthReport>();
        assert_serialize::<health::Warning>();
        assert_serialize::<deps::Dependency>();
        assert_serialize::<process::CommandOutput>();
        assert_serialize::<safety::Assessment>();
        assert_serialize::<safety::Risk>();
        assert_serialize::<analytics::ActivityReport>();
        assert_serialize::<analytics::Session>();
        assert_serialize::<analytics::BuildRecord>();
        assert_serialize::<Language>();
        assert_serialize::<EcosystemLink>();
        assert_serialize::<workspace::Workspace>();
        assert_serialize::<workspace::Task>();
        assert_serialize::<workspace::TerminalTab>();
        assert_serialize::<workspace::Bookmark>();
        assert_serialize::<env::EnvReport>();
        assert_serialize::<env::EnvFile>();
        assert_serialize::<env::Entry>();
        assert_serialize::<env::Issue>();
        assert_serialize::<env::Scope>();
        assert_serialize::<shell::Shell>();
        assert_serialize::<shell::ShellKind>();
        assert_serialize::<files::FileNode>();
        assert_serialize::<files::FileContents>();
        assert_serialize::<files::Encoding>();
        assert_serialize::<files::LineEnding>();

        // Types the frontend also sends back must round-trip. `save_workspace`
        // takes a Workspace as a command *parameter*, so it must deserialize.
        assert_deserialize::<Project>();
        assert_deserialize::<process::CommandOutput>();
        assert_deserialize::<safety::Assessment>();
        assert_deserialize::<workspace::Workspace>();
        assert_deserialize::<env::EnvReport>();
    }

    #[test]
    fn detects_a_rust_project() {
        let tmp = tempfile::tempdir().unwrap();
        write(
            tmp.path(),
            "Cargo.toml",
            "[package]\nname = \"demo\"\n\n[dependencies]\naxum = \"0.7\"\nserde = \"1\"\n",
        );
        write(tmp.path(), "src/main.rs", "fn main() {}\n");

        let project = scan::analyze(tmp.path()).unwrap().unwrap();
        assert_eq!(project.primary_language, Language::Rust);
        assert_eq!(project.ecosystems[0].framework.as_deref(), Some("Axum"));
        assert!(project.commands.iter().any(|c| c.name == "build"));
        assert_eq!(project.dependency_count, 2);
    }

    #[test]
    fn detects_typescript_over_javascript() {
        let tmp = tempfile::tempdir().unwrap();
        write(
            tmp.path(),
            "package.json",
            r#"{"name":"web","scripts":{"dev":"next dev"},"dependencies":{"next":"14"},"devDependencies":{"typescript":"5"}}"#,
        );
        let project = scan::analyze(tmp.path()).unwrap().unwrap();
        assert_eq!(project.primary_language, Language::TypeScript);
        assert_eq!(project.ecosystems[0].framework.as_deref(), Some("Next.js"));
        assert!(project.commands.iter().any(|c| c.name == "dev"));
    }

    #[test]
    fn scan_finds_multiple_projects_and_skips_node_modules() {
        let root = tempfile::tempdir().unwrap();
        write(root.path(), "api/Cargo.toml", "[package]\nname=\"api\"\n");
        write(root.path(), "web/package.json", r#"{"name":"web"}"#);
        // A stray manifest inside an ignored dir must not become a project.
        write(
            root.path(),
            "web/node_modules/leftpad/package.json",
            r#"{"name":"leftpad"}"#,
        );

        let projects = scan::scan(root.path()).unwrap();
        assert_eq!(
            projects.len(),
            2,
            "found: {:?}",
            projects.iter().map(|p| &p.name).collect::<Vec<_>>()
        );
    }

    #[test]
    fn profile_roundtrip_and_override() {
        let tmp = tempfile::tempdir().unwrap();
        write(tmp.path(), "Cargo.toml", "[package]\nname=\"demo\"\n");
        write(
            tmp.path(),
            profile::PROFILE_FILE,
            "[project]\nname = \"Blink\"\ndescription = \"Accelerator\"\n\n[commands]\ndev = \"cargo run --release\"\n",
        );

        let project = scan::analyze(tmp.path()).unwrap().unwrap();
        assert_eq!(project.name, "Blink");
        assert_eq!(project.description.as_deref(), Some("Accelerator"));
        // Profile command overrides the convention default.
        let dev = project.commands.iter().find(|c| c.name == "dev").unwrap();
        assert_eq!(dev.display(), "cargo run --release");
        assert_eq!(dev.source, CommandSource::Profile);

        // And it renders back out to valid TOML that re-parses.
        let rendered = profile::render(&project);
        let reparsed = profile::parse(&rendered).unwrap();
        assert_eq!(reparsed.name.as_deref(), Some("Blink"));
    }

    #[test]
    fn health_flags_large_files_and_todos() {
        let tmp = tempfile::tempdir().unwrap();
        write(tmp.path(), "Cargo.toml", "[package]\nname=\"demo\"\n");
        let big = "// line\n".repeat(700) + "// TODO: refactor this\n";
        write(tmp.path(), "src/huge.rs", &big);

        let report = health::analyze_path(tmp.path());
        assert!(report.score < 100);
        assert!(report.warnings.iter().any(|w| w.kind == "large-file"));
        assert_eq!(report.todo_count, 1);
    }

    #[test]
    fn ecosystem_link_recognises_siblings() {
        let root = tempfile::tempdir().unwrap();
        let blink = root.path().join("blink");
        fs::create_dir_all(&blink).unwrap();
        write(&blink, "Cargo.toml", "[package]\nname=\"blink\"\n");
        let project = scan::analyze(&blink).unwrap().unwrap();
        assert_eq!(project.ecosystem_link, Some(EcosystemLink::Blink));
    }

    #[test]
    fn analytics_aggregate_is_deterministic() {
        use analytics::{aggregate, BuildRecord, Session};
        let sessions = vec![
            Session {
                project_id: "a".into(),
                language: Language::Rust,
                started_at: 0,
                duration_secs: 3600,
            },
            Session {
                project_id: "a".into(),
                language: Language::Rust,
                started_at: 10,
                duration_secs: 1800,
            },
            Session {
                project_id: "b".into(),
                language: Language::TypeScript,
                started_at: 20,
                duration_secs: 900,
            },
        ];
        let builds = vec![
            BuildRecord {
                project_id: "a".into(),
                started_at: 0,
                duration_ms: 2000,
                success: true,
            },
            BuildRecord {
                project_id: "a".into(),
                started_at: 1,
                duration_ms: 18000,
                success: true,
            },
            BuildRecord {
                project_id: "a".into(),
                started_at: 2,
                duration_ms: 4000,
                success: false,
            },
        ];
        let report = aggregate(&sessions, &builds);
        assert_eq!(report.total_seconds, 6300);
        assert_eq!(report.projects_touched, 2);
        assert_eq!(report.languages[0].language, Language::Rust);
        assert_eq!(report.languages[0].seconds, 5400);
        assert_eq!(report.median_build_ms, Some(4000));
    }

    #[cfg(feature = "persistence")]
    #[test]
    fn store_persists_projects_and_analytics() {
        use analytics::Session;
        use store::{Store, StoredProject};

        let store = Store::in_memory().unwrap();
        store
            .upsert_project(
                &StoredProject {
                    id: "abc".into(),
                    path: "/tmp/demo".into(),
                    name: "Demo".into(),
                    last_opened: None,
                    pinned: false,
                },
                100,
            )
            .unwrap();
        store.touch_project("abc", 200).unwrap();
        let projects = store.projects().unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].last_opened, Some(200));

        store.set_setting("theme", "dark").unwrap();
        assert_eq!(store.get_setting("theme").unwrap().as_deref(), Some("dark"));

        store
            .record_session(&Session {
                project_id: "abc".into(),
                language: Language::Rust,
                started_at: 500,
                duration_secs: 1200,
            })
            .unwrap();
        let sessions = store.sessions_since(0).unwrap();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].language, Language::Rust);
    }

    #[cfg(feature = "persistence")]
    #[test]
    fn store_persists_workspaces() {
        use store::Store;
        use workspace::{Bookmark, Task, Workspace};

        let store = Store::in_memory().unwrap();

        // An unsaved project falls back to an empty workspace.
        assert!(store.workspace("nope").unwrap().is_none());
        assert!(store.workspace_or_default("nope").unwrap().is_empty());

        let mut ws = Workspace::new("abc");
        ws.notes = "# Setup\n- [ ] install deps".into();
        ws.upsert_task(Task {
            id: "t1".into(),
            name: "dev".into(),
            command: "cargo run".into(),
            favorite: true,
        });
        ws.upsert_bookmark(Bookmark {
            id: "b1".into(),
            label: "Docs".into(),
            url: "https://orbit.blinkdev.me/docs".into(),
        });
        store.save_workspace(&ws, 1_700_000_000).unwrap();

        let loaded = store.workspace("abc").unwrap().unwrap();
        assert_eq!(loaded.notes, ws.notes);
        assert_eq!(loaded.tasks.len(), 1);
        assert_eq!(loaded.bookmarks[0].label, "Docs");
        assert_eq!(loaded.updated_at, 1_700_000_000, "save stamps updated_at");

        // Saving again updates in place rather than duplicating.
        let mut edited = loaded.clone();
        edited.notes = "changed".into();
        store.save_workspace(&edited, 1_700_000_100).unwrap();
        let reloaded = store.workspace("abc").unwrap().unwrap();
        assert_eq!(reloaded.notes, "changed");
        assert_eq!(reloaded.updated_at, 1_700_000_100);

        store.remove_workspace("abc").unwrap();
        assert!(store.workspace("abc").unwrap().is_none());
    }
}
