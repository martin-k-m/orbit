//! Shared application state.
//!
//! The desktop process owns a single [`orbit_core::store::Store`] (the local
//! SQLite database) and a registry of processes it has spawned. Both are held
//! behind a `Mutex` because Tauri command handlers run on a thread pool.

use orbit_core::process::RunningProcess;
use orbit_core::store::Store;
use std::collections::HashMap;
use std::sync::Mutex;

/// The state made available to every Tauri command via `tauri::State`.
pub struct AppState {
    /// The local database. `None` only if it failed to open at startup, in
    /// which case commands that need it return a clear error.
    pub store: Mutex<Option<Store>>,
    /// Long-running processes Orbit launched, keyed by an opaque id.
    pub processes: Mutex<HashMap<String, RunningProcess>>,
}

impl AppState {
    /// Create an empty state; the store is attached during setup.
    pub fn new() -> Self {
        AppState {
            store: Mutex::new(None),
            processes: Mutex::new(HashMap::new()),
        }
    }

    /// Run a closure with the open store, or return an error string if the
    /// database is unavailable.
    pub fn with_store<T>(
        &self,
        f: impl FnOnce(&Store) -> Result<T, String>,
    ) -> Result<T, String> {
        let guard = self.store.lock().map_err(|_| "state lock poisoned".to_string())?;
        match guard.as_ref() {
            Some(store) => f(store),
            None => Err("local database is unavailable".to_string()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
