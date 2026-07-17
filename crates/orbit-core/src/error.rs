//! Error types for the Orbit engine.

use std::path::PathBuf;

/// The result type used throughout `orbit-core`.
pub type Result<T> = std::result::Result<T, Error>;

/// Any failure the engine can produce.
///
/// Errors are intentionally coarse-grained and carry enough context to be
/// surfaced directly in the desktop UI or the CLI.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// A path the user pointed us at does not exist or is not a directory.
    #[error("path does not exist or is not a directory: {0}")]
    InvalidPath(PathBuf),

    /// We could not read a file or directory.
    #[error("i/o error at {path}: {source}")]
    Io {
        /// The path we were operating on.
        path: PathBuf,
        /// The underlying OS error.
        #[source]
        source: std::io::Error,
    },

    /// A project profile (`.project-orbit`) failed to parse.
    #[error("could not parse project profile: {0}")]
    Profile(String),

    /// Serializing or deserializing data failed.
    #[error("serialization error: {0}")]
    Serde(String),

    /// An external command (e.g. `git`) failed to run.
    #[error("command `{command}` failed: {message}")]
    Command {
        /// The program we tried to execute.
        command: String,
        /// A human-readable explanation.
        message: String,
    },

    /// The local database rejected an operation.
    #[cfg(feature = "persistence")]
    #[error("storage error: {0}")]
    Storage(String),
}

impl Error {
    /// Build an [`Error::Io`] with the offending path attached.
    pub(crate) fn io(path: impl Into<PathBuf>, source: std::io::Error) -> Self {
        Error::Io {
            path: path.into(),
            source,
        }
    }
}

impl From<serde_json::Error> for Error {
    fn from(value: serde_json::Error) -> Self {
        Error::Serde(value.to_string())
    }
}

#[cfg(feature = "persistence")]
impl From<rusqlite::Error> for Error {
    fn from(value: rusqlite::Error) -> Self {
        Error::Storage(value.to_string())
    }
}
