//! Local SQLite persistence.
//!
//! The store is Orbit's memory: which projects the user added, their settings,
//! and the analytics event log. It is a thin, synchronous wrapper over
//! `rusqlite` with a tiny embedded migration runner so schema upgrades are
//! deterministic and offline. Everything lives in a single file the user owns.
//!
//! This module is compiled only when the `persistence` feature is enabled.

use crate::analytics::{BuildRecord, Session};
use crate::model::Language;
use crate::Result;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::{Path, PathBuf};

/// A handle to the on-disk Orbit database.
#[derive(Debug)]
pub struct Store {
    conn: Connection,
}

/// A project as remembered by the store (a user "added" it to Orbit).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredProject {
    /// Stable project id (see [`crate::model::Project::id_for_path`]).
    pub id: String,
    /// Absolute path on disk.
    pub path: PathBuf,
    /// Display name at the time it was added.
    pub name: String,
    /// Last time the user opened it, unix seconds.
    pub last_opened: Option<i64>,
    /// Whether the user pinned it to the top of the dashboard.
    pub pinned: bool,
}

impl Store {
    /// Open (creating if needed) the database at `path` and run migrations.
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let conn = Connection::open(path.as_ref())?;
        let store = Store { conn };
        store.configure()?;
        store.migrate()?;
        Ok(store)
    }

    /// Open an in-memory database — used by tests and ephemeral sessions.
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let store = Store { conn };
        store.migrate()?;
        Ok(store)
    }

    fn configure(&self) -> Result<()> {
        // WAL gives us concurrent reads while a write is in flight — the app's
        // UI thread stays responsive while analytics are being written.
        self.conn.pragma_update(None, "journal_mode", "WAL")?;
        self.conn.pragma_update(None, "foreign_keys", "ON")?;
        Ok(())
    }

    /// Apply any pending schema migrations.
    ///
    /// `user_version` tracks the schema revision; each step below bumps it by
    /// one so upgrades are idempotent and ordered.
    fn migrate(&self) -> Result<()> {
        let version: i64 = self
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;

        if version < 1 {
            self.conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS projects (
                    id           TEXT PRIMARY KEY,
                    path         TEXT NOT NULL UNIQUE,
                    name         TEXT NOT NULL,
                    last_opened  INTEGER,
                    pinned       INTEGER NOT NULL DEFAULT 0,
                    added_at     INTEGER NOT NULL
                 );
                 CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                 );
                 CREATE TABLE IF NOT EXISTS sessions (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id   TEXT NOT NULL,
                    language     TEXT NOT NULL,
                    started_at   INTEGER NOT NULL,
                    duration_secs INTEGER NOT NULL
                 );
                 CREATE TABLE IF NOT EXISTS builds (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id   TEXT NOT NULL,
                    started_at   INTEGER NOT NULL,
                    duration_ms  INTEGER NOT NULL,
                    success      INTEGER NOT NULL
                 );
                 CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
                 CREATE INDEX IF NOT EXISTS idx_builds_started ON builds(started_at);
                 PRAGMA user_version = 1;",
            )?;
        }

        Ok(())
    }

    // --- Projects ---------------------------------------------------------

    /// Remember a project, or update its name/path if the id already exists.
    pub fn upsert_project(&self, project: &StoredProject, added_at: i64) -> Result<()> {
        self.conn.execute(
            "INSERT INTO projects (id, path, name, last_opened, pinned, added_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                path = excluded.path,
                name = excluded.name",
            params![
                project.id,
                project.path.to_string_lossy(),
                project.name,
                project.last_opened,
                project.pinned as i64,
                added_at,
            ],
        )?;
        Ok(())
    }

    /// Every project the user has added, most-recently-opened first.
    pub fn projects(&self) -> Result<Vec<StoredProject>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, path, name, last_opened, pinned
             FROM projects
             ORDER BY pinned DESC, last_opened DESC NULLS LAST, name ASC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(StoredProject {
                    id: row.get(0)?,
                    path: PathBuf::from(row.get::<_, String>(1)?),
                    name: row.get(2)?,
                    last_opened: row.get(3)?,
                    pinned: row.get::<_, i64>(4)? != 0,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// Mark a project as opened at `when` (unix seconds).
    pub fn touch_project(&self, id: &str, when: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET last_opened = ?2 WHERE id = ?1",
            params![id, when],
        )?;
        Ok(())
    }

    /// Toggle a project's pinned state, returning the new value.
    pub fn set_pinned(&self, id: &str, pinned: bool) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET pinned = ?2 WHERE id = ?1",
            params![id, pinned as i64],
        )?;
        Ok(())
    }

    /// Forget a project (does not touch the folder on disk).
    pub fn remove_project(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Settings ---------------------------------------------------------

    /// Read a setting value by key.
    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        Ok(self
            .conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()?)
    }

    /// Write a setting value.
    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    // --- Analytics --------------------------------------------------------

    /// Append a coding session to the event log.
    pub fn record_session(&self, session: &Session) -> Result<()> {
        self.conn.execute(
            "INSERT INTO sessions (project_id, language, started_at, duration_secs)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                session.project_id,
                language_key(session.language),
                session.started_at,
                session.duration_secs,
            ],
        )?;
        Ok(())
    }

    /// Append a build record to the event log.
    pub fn record_build(&self, build: &BuildRecord) -> Result<()> {
        self.conn.execute(
            "INSERT INTO builds (project_id, started_at, duration_ms, success)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                build.project_id,
                build.started_at,
                build.duration_ms,
                build.success as i64,
            ],
        )?;
        Ok(())
    }

    /// All sessions started at or after `since` (unix seconds).
    pub fn sessions_since(&self, since: i64) -> Result<Vec<Session>> {
        let mut stmt = self.conn.prepare(
            "SELECT project_id, language, started_at, duration_secs
             FROM sessions WHERE started_at >= ?1 ORDER BY started_at",
        )?;
        let rows = stmt
            .query_map(params![since], |row| {
                Ok(Session {
                    project_id: row.get(0)?,
                    language: language_from_key(&row.get::<_, String>(1)?),
                    started_at: row.get(2)?,
                    duration_secs: row.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// All builds started at or after `since` (unix seconds).
    pub fn builds_since(&self, since: i64) -> Result<Vec<BuildRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT project_id, started_at, duration_ms, success
             FROM builds WHERE started_at >= ?1 ORDER BY started_at",
        )?;
        let rows = stmt
            .query_map(params![since], |row| {
                Ok(BuildRecord {
                    project_id: row.get(0)?,
                    started_at: row.get(1)?,
                    duration_ms: row.get(2)?,
                    success: row.get::<_, i64>(3)? != 0,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }
}

/// The stable string key we persist for a language (matches the serde repr).
fn language_key(language: Language) -> &'static str {
    match language {
        Language::Rust => "rust",
        Language::TypeScript => "type-script",
        Language::JavaScript => "java-script",
        Language::Python => "python",
        Language::Go => "go",
        Language::Docker => "docker",
        Language::Unknown => "unknown",
    }
}

fn language_from_key(key: &str) -> Language {
    match key {
        "rust" => Language::Rust,
        "type-script" => Language::TypeScript,
        "java-script" => Language::JavaScript,
        "python" => Language::Python,
        "go" => Language::Go,
        "docker" => Language::Docker,
        _ => Language::Unknown,
    }
}
