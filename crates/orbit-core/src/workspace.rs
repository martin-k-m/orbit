//! Project workspaces.
//!
//! A project is more than a folder: it's the terminals you had open, the
//! commands you actually run, the notes you keep, the links you need and the
//! logs you pinned. A [`Workspace`] is everything Orbit remembers about a
//! project so switching to it restores the whole context instantly.
//!
//! Workspaces are stored as JSON in the local SQLite database, keyed by project
//! id. That keeps the schema stable while the shape evolves — the alternative
//! (a table per collection) would mean a migration for every new field.
//!
//! Everything here is pure data: no I/O, no network. The store handles
//! persistence and the desktop app handles presentation.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A saved terminal tab belonging to a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalTab {
    /// Stable id for the tab.
    pub id: String,
    /// User-visible tab title.
    pub title: String,
    /// The shell program to launch (e.g. `pwsh`, `bash`, `zsh`).
    pub shell: String,
    /// Working directory the tab opens in.
    pub cwd: PathBuf,
}

/// A saved link — docs, dashboards, a staging URL, anything.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bookmark {
    /// Stable id.
    pub id: String,
    /// Display label.
    pub label: String,
    /// The URL (or a local path).
    pub url: String,
}

/// A pinned, runnable task for the project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    /// Stable id.
    pub id: String,
    /// Display name, e.g. `dev`, `migrate`, `seed db`.
    pub name: String,
    /// The command line to run, e.g. `cargo run --release`.
    pub command: String,
    /// Whether the user starred it (shown first).
    #[serde(default)]
    pub favorite: bool,
}

impl Task {
    /// Parse the task's command line into a runnable [`crate::model::Command`].
    ///
    /// Returns `None` if the command line is empty.
    pub fn to_command(&self) -> Option<crate::model::Command> {
        crate::model::Command::parse(
            self.name.clone(),
            &self.command,
            crate::model::CommandSource::Profile,
        )
    }

    /// Assess how risky this task is before running it.
    pub fn assess(&self) -> Option<crate::safety::Assessment> {
        let command = self.to_command()?;
        Some(crate::safety::assess(&command.program, &command.args))
    }
}

/// Everything Orbit remembers about a project.
///
/// A workspace is created lazily: an untouched project has [`Workspace::new`]'s
/// empty defaults, which cost nothing to store.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    /// The project this workspace belongs to.
    pub project_id: String,
    /// Free-form Markdown notes (TODOs, setup steps, architecture).
    #[serde(default)]
    pub notes: String,
    /// Saved terminal tabs, restored on open.
    #[serde(default)]
    pub terminals: Vec<TerminalTab>,
    /// Saved links.
    #[serde(default)]
    pub bookmarks: Vec<Bookmark>,
    /// Pinned tasks.
    #[serde(default)]
    pub tasks: Vec<Task>,
    /// Last time the workspace changed, unix seconds.
    #[serde(default)]
    pub updated_at: i64,
}

impl Workspace {
    /// An empty workspace for `project_id`.
    pub fn new(project_id: impl Into<String>) -> Self {
        Workspace {
            project_id: project_id.into(),
            notes: String::new(),
            terminals: Vec::new(),
            bookmarks: Vec::new(),
            tasks: Vec::new(),
            updated_at: 0,
        }
    }

    /// Whether the user has actually put anything in this workspace.
    ///
    /// Empty workspaces don't need to be persisted or shown.
    pub fn is_empty(&self) -> bool {
        self.notes.trim().is_empty()
            && self.terminals.is_empty()
            && self.bookmarks.is_empty()
            && self.tasks.is_empty()
    }

    /// Tasks with favourites first, then in insertion order.
    pub fn ordered_tasks(&self) -> Vec<&Task> {
        let mut tasks: Vec<&Task> = self.tasks.iter().collect();
        tasks.sort_by_key(|t| !t.favorite);
        tasks
    }

    /// Add or replace a task by id, returning whether it replaced an existing one.
    pub fn upsert_task(&mut self, task: Task) -> bool {
        match self.tasks.iter_mut().find(|t| t.id == task.id) {
            Some(existing) => {
                *existing = task;
                true
            }
            None => {
                self.tasks.push(task);
                false
            }
        }
    }

    /// Remove a task by id, returning whether it existed.
    pub fn remove_task(&mut self, id: &str) -> bool {
        let before = self.tasks.len();
        self.tasks.retain(|t| t.id != id);
        self.tasks.len() != before
    }

    /// Add or replace a terminal tab by id.
    pub fn upsert_terminal(&mut self, tab: TerminalTab) -> bool {
        match self.terminals.iter_mut().find(|t| t.id == tab.id) {
            Some(existing) => {
                *existing = tab;
                true
            }
            None => {
                self.terminals.push(tab);
                false
            }
        }
    }

    /// Remove a terminal tab by id, returning whether it existed.
    pub fn remove_terminal(&mut self, id: &str) -> bool {
        let before = self.terminals.len();
        self.terminals.retain(|t| t.id != id);
        self.terminals.len() != before
    }

    /// Add or replace a bookmark by id.
    pub fn upsert_bookmark(&mut self, bookmark: Bookmark) -> bool {
        match self.bookmarks.iter_mut().find(|b| b.id == bookmark.id) {
            Some(existing) => {
                *existing = bookmark;
                true
            }
            None => {
                self.bookmarks.push(bookmark);
                false
            }
        }
    }

    /// Remove a bookmark by id, returning whether it existed.
    pub fn remove_bookmark(&mut self, id: &str) -> bool {
        let before = self.bookmarks.len();
        self.bookmarks.retain(|b| b.id != id);
        self.bookmarks.len() != before
    }

    /// Seed a workspace's tasks from a scanned project's detected commands.
    ///
    /// Used the first time a project is opened so the task list isn't empty.
    /// Existing tasks with the same name are left alone.
    pub fn seed_tasks_from(&mut self, project: &crate::model::Project) {
        for command in &project.commands {
            if self.tasks.iter().any(|t| t.name == command.name) {
                continue;
            }
            self.tasks.push(Task {
                id: format!("detected:{}", command.name),
                name: command.name.clone(),
                command: command.display(),
                favorite: matches!(command.name.as_str(), "dev" | "test" | "build"),
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Command, CommandSource, Language, Project};

    fn task(id: &str, name: &str, command: &str, favorite: bool) -> Task {
        Task {
            id: id.into(),
            name: name.into(),
            command: command.into(),
            favorite,
        }
    }

    #[test]
    fn a_new_workspace_is_empty() {
        let ws = Workspace::new("abc");
        assert!(ws.is_empty());
        assert_eq!(ws.project_id, "abc");
    }

    #[test]
    fn notes_alone_make_it_non_empty() {
        let mut ws = Workspace::new("abc");
        ws.notes = "  ".into();
        assert!(ws.is_empty(), "whitespace-only notes are still empty");
        ws.notes = "# TODO".into();
        assert!(!ws.is_empty());
    }

    #[test]
    fn upsert_task_replaces_by_id() {
        let mut ws = Workspace::new("abc");
        assert!(!ws.upsert_task(task("t1", "dev", "cargo run", false)));
        assert_eq!(ws.tasks.len(), 1);
        // Same id -> replace, not append.
        assert!(ws.upsert_task(task("t1", "dev", "cargo run --release", true)));
        assert_eq!(ws.tasks.len(), 1);
        assert_eq!(ws.tasks[0].command, "cargo run --release");
        assert!(ws.tasks[0].favorite);
    }

    #[test]
    fn remove_task_reports_existence() {
        let mut ws = Workspace::new("abc");
        ws.upsert_task(task("t1", "dev", "cargo run", false));
        assert!(ws.remove_task("t1"));
        assert!(!ws.remove_task("t1"));
        assert!(ws.tasks.is_empty());
    }

    #[test]
    fn favourites_are_ordered_first() {
        let mut ws = Workspace::new("abc");
        ws.upsert_task(task("t1", "lint", "cargo clippy", false));
        ws.upsert_task(task("t2", "dev", "cargo run", true));
        ws.upsert_task(task("t3", "test", "cargo test", false));
        let names: Vec<&str> = ws.ordered_tasks().iter().map(|t| t.name.as_str()).collect();
        assert_eq!(names, vec!["dev", "lint", "test"]);
    }

    #[test]
    fn terminals_and_bookmarks_upsert_and_remove() {
        let mut ws = Workspace::new("abc");
        let tab = TerminalTab {
            id: "term1".into(),
            title: "server".into(),
            shell: "bash".into(),
            cwd: "/tmp/demo".into(),
        };
        assert!(!ws.upsert_terminal(tab.clone()));
        assert!(ws.upsert_terminal(TerminalTab {
            title: "api".into(),
            ..tab
        }));
        assert_eq!(ws.terminals.len(), 1);
        assert_eq!(ws.terminals[0].title, "api");
        assert!(ws.remove_terminal("term1"));
        assert!(!ws.remove_terminal("term1"));

        let bookmark = Bookmark {
            id: "b1".into(),
            label: "Docs".into(),
            url: "https://orbit.blinkdev.me/docs".into(),
        };
        assert!(!ws.upsert_bookmark(bookmark));
        assert_eq!(ws.bookmarks.len(), 1);
        assert!(ws.remove_bookmark("b1"));
        assert!(ws.bookmarks.is_empty());
    }

    #[test]
    fn tasks_convert_to_runnable_commands_and_are_assessed() {
        let safe = task("t1", "build", "cargo build --release", false);
        let command = safe.to_command().unwrap();
        assert_eq!(command.program, "cargo");
        assert_eq!(command.args, vec!["build", "--release"]);
        assert_eq!(safe.assess().unwrap().risk, crate::safety::Risk::Safe);

        // The safety guard applies to user-defined tasks too.
        let nasty = task("t2", "clean", "rm -rf /", false);
        assert_eq!(nasty.assess().unwrap().risk, crate::safety::Risk::Dangerous);

        let empty = task("t3", "noop", "", false);
        assert!(empty.to_command().is_none());
    }

    #[test]
    fn seeding_from_a_project_fills_tasks_once() {
        let project = Project {
            id: "abc".into(),
            name: "demo".into(),
            path: "/tmp/demo".into(),
            primary_language: Language::Rust,
            ecosystems: Vec::new(),
            commands: vec![
                Command::parse("dev", "cargo run", CommandSource::Convention).unwrap(),
                Command::parse("test", "cargo test", CommandSource::Convention).unwrap(),
                Command::parse("lint", "cargo clippy", CommandSource::Convention).unwrap(),
            ],
            description: None,
            has_profile: false,
            dependency_count: 0,
            ecosystem_link: None,
        };

        let mut ws = Workspace::new("abc");
        ws.seed_tasks_from(&project);
        assert_eq!(ws.tasks.len(), 3);
        // dev/test are favourited by default, lint is not.
        assert!(ws.tasks.iter().find(|t| t.name == "dev").unwrap().favorite);
        assert!(!ws.tasks.iter().find(|t| t.name == "lint").unwrap().favorite);

        // Seeding again is idempotent and never clobbers user edits.
        ws.tasks[0].command = "cargo run --release".into();
        ws.seed_tasks_from(&project);
        assert_eq!(ws.tasks.len(), 3);
        assert_eq!(ws.tasks[0].command, "cargo run --release");
    }

    #[test]
    fn workspace_round_trips_through_json() {
        let mut ws = Workspace::new("abc");
        ws.notes = "# Setup\n- [ ] install deps".into();
        ws.upsert_task(task("t1", "dev", "cargo run", true));
        ws.upsert_bookmark(Bookmark {
            id: "b1".into(),
            label: "Docs".into(),
            url: "https://example.com".into(),
        });
        let json = serde_json::to_string(&ws).unwrap();
        let back: Workspace = serde_json::from_str(&json).unwrap();
        assert_eq!(ws, back);
        // camelCase on the wire for the frontend.
        assert!(json.contains("\"projectId\""));
    }
}
