//! The integrated terminal: real PTY sessions.
//!
//! Each terminal tab is a shell running on a pseudo-terminal — ConPTY on
//! Windows, `openpty` elsewhere — via `portable-pty`. That's what makes it a
//! *terminal* rather than a command runner: programs see a TTY, so colours,
//! progress bars, prompts, `top`, `vim` and Ctrl-C all behave.
//!
//! Data flow:
//!
//! ```text
//!   xterm.js  --terminal_write-->  PTY master  -->  shell
//!   xterm.js  <--"terminal:output" event--  reader thread  <--  PTY master
//! ```
//!
//! Each session owns a reader thread that pumps bytes to the frontend as they
//! arrive, so output streams instead of arriving in one lump at exit.

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

/// Emitted for every chunk of output a session produces.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutput {
    /// The session the output belongs to.
    pub id: String,
    /// The raw bytes, lossily decoded (xterm.js handles the escape codes).
    pub data: String,
}

/// Emitted once when a session's shell exits.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExit {
    /// The session that ended.
    pub id: String,
    /// The shell's exit code, if we could read one.
    pub code: Option<i32>,
}

/// A live PTY session.
///
/// `master` is kept alive for resizing; dropping it closes the PTY.
struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

/// All open terminal sessions, keyed by id.
#[derive(Default)]
pub struct Terminals {
    sessions: Mutex<HashMap<String, Session>>,
    next_id: AtomicU64,
}

impl std::fmt::Debug for Terminals {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let open = self.sessions.lock().map(|s| s.len()).unwrap_or(0);
        f.debug_struct("Terminals").field("open", &open).finish()
    }
}

impl Terminals {
    /// Create an empty registry.
    pub fn new() -> Self {
        Self::default()
    }

    fn mint_id(&self) -> String {
        format!("term-{}", self.next_id.fetch_add(1, Ordering::Relaxed))
    }

    /// Open a shell on a PTY in `cwd` and start streaming its output.
    ///
    /// Returns the new session id. `shell` defaults to the user's preferred
    /// shell (see [`orbit_core::shell`]).
    pub fn open(
        &self,
        app: &AppHandle,
        cwd: &Path,
        shell: Option<String>,
        cols: u16,
        rows: u16,
    ) -> Result<String, String> {
        if !cwd.is_dir() {
            return Err(format!("{} is not a directory", cwd.display()));
        }

        let shell = match shell {
            Some(program) => orbit_core::shell::Shell::from_program(program),
            None => orbit_core::shell::preferred(),
        };

        let pty = native_pty_system();
        let pair = pty
            .openpty(PtySize {
                rows: rows.max(1),
                cols: cols.max(1),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("could not open a pty: {e}"))?;

        let mut cmd = CommandBuilder::new(&shell.program);
        for arg in &shell.args {
            cmd.arg(arg);
        }
        cmd.cwd(cwd);
        // Programs use TERM to decide what escape codes to emit; xterm.js speaks
        // xterm-256color, and without this many tools fall back to no colour.
        cmd.env("TERM", "xterm-256color");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("could not start {}: {e}", shell.program))?;
        // The slave must be dropped or the PTY never reports EOF on exit.
        drop(pair.slave);

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("could not read from the pty: {e}"))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("could not write to the pty: {e}"))?;

        let id = self.mint_id();
        pump(app.clone(), id.clone(), reader);

        let mut sessions = self.sessions.lock().map_err(|_| "terminal lock poisoned")?;
        sessions.insert(
            id.clone(),
            Session {
                master: pair.master,
                writer,
                child,
            },
        );
        Ok(id)
    }

    /// Send input (keystrokes) to a session.
    pub fn write(&self, id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|_| "terminal lock poisoned")?;
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| format!("no such terminal: {id}"))?;
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        session.writer.flush().map_err(|e| e.to_string())
    }

    /// Tell the shell the window changed size, so it can reflow.
    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|_| "terminal lock poisoned")?;
        let session = sessions
            .get(id)
            .ok_or_else(|| format!("no such terminal: {id}"))?;
        session
            .master
            .resize(PtySize {
                rows: rows.max(1),
                cols: cols.max(1),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }

    /// Kill a session's shell and forget it.
    pub fn close(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|_| "terminal lock poisoned")?;
        if let Some(mut session) = sessions.remove(id) {
            // Best effort: the shell may already have exited on its own.
            let _ = session.child.kill();
            let _ = session.child.wait();
        }
        Ok(())
    }

    /// The ids of every open session.
    pub fn open_ids(&self) -> Vec<String> {
        self.sessions
            .lock()
            .map(|s| s.keys().cloned().collect())
            .unwrap_or_default()
    }
}

/// Stream a session's output to the frontend until the shell exits.
///
/// Runs on its own thread: PTY reads block, and blocking Tauri's async runtime
/// would freeze the app.
fn pump(app: AppHandle, id: String, mut reader: Box<dyn Read + Send>) {
    std::thread::spawn(move || {
        let mut buf = [0u8; 8 * 1024];
        loop {
            match reader.read(&mut buf) {
                // EOF: the shell exited and closed the PTY.
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    if app
                        .emit("terminal:output", TerminalOutput { id: id.clone(), data })
                        .is_err()
                    {
                        // The window is gone; nothing left to stream to.
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        let _ = app.emit("terminal:exit", TerminalExit { id, code: None });
    });
}
