//! Process management.
//!
//! Orbit launches project commands (dev servers, builds, test runs) and tracks
//! them so the desktop app can show what is running and stop it. This module
//! provides the OS-facing primitives; the desktop app layers a registry and
//! event streaming on top.

use crate::model::Command;
use crate::{Error, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Child, Command as OsCommand, Stdio};

/// A handle to a spawned process.
#[derive(Debug)]
pub struct RunningProcess {
    /// The OS process id.
    pub pid: u32,
    /// The command that was launched, for display.
    pub command: Command,
    child: Child,
}

impl RunningProcess {
    /// Check whether the process has exited, returning its exit code if so.
    pub fn poll(&mut self) -> Result<Option<i32>> {
        match self.child.try_wait() {
            Ok(Some(status)) => Ok(Some(status.code().unwrap_or(-1))),
            Ok(None) => Ok(None),
            Err(e) => Err(Error::Command {
                command: self.command.display(),
                message: e.to_string(),
            }),
        }
    }

    /// Ask the process to terminate.
    pub fn kill(&mut self) -> Result<()> {
        self.child.kill().map_err(|e| Error::Command {
            command: self.command.display(),
            message: e.to_string(),
        })
    }
}

/// Spawn a project command in `dir` with stdout/stderr piped for capture.
///
/// The returned [`RunningProcess`] must be polled or killed by the caller; on
/// drop the OS process is *not* automatically reaped, matching std behaviour.
pub fn spawn(dir: &Path, command: &Command) -> Result<RunningProcess> {
    if !dir.is_dir() {
        return Err(Error::InvalidPath(dir.to_path_buf()));
    }
    let child = build(dir, command)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| Error::Command {
            command: command.display(),
            message: e.to_string(),
        })?;

    Ok(RunningProcess {
        pid: child.id(),
        command: command.clone(),
        child,
    })
}

/// Run a command to completion, capturing its output.
///
/// Suitable for short-lived commands (a build, a test run). For long-running
/// processes such as dev servers use [`spawn`] instead.
pub fn run_to_completion(dir: &Path, command: &Command) -> Result<CommandOutput> {
    if !dir.is_dir() {
        return Err(Error::InvalidPath(dir.to_path_buf()));
    }
    let output = build(dir, command).output().map_err(|e| Error::Command {
        command: command.display(),
        message: e.to_string(),
    })?;

    Ok(CommandOutput {
        code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

/// The captured result of a completed command.
///
/// This crosses the Tauri IPC boundary (it is the return type of the
/// `run_command` handler), so it must be `Serialize`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandOutput {
    /// Process exit code (`-1` if it was killed by a signal).
    pub code: i32,
    /// Captured standard output.
    pub stdout: String,
    /// Captured standard error.
    pub stderr: String,
}

impl CommandOutput {
    /// Whether the command exited successfully.
    pub fn success(&self) -> bool {
        self.code == 0
    }
}

fn build(dir: &Path, command: &Command) -> OsCommand {
    let mut os = OsCommand::new(&command.program);
    os.args(&command.args).current_dir(dir);
    os
}

/// The platform's default interactive shell, used to open a terminal in a
/// project directory. Returns `(program, args)`.
pub fn default_shell() -> (String, Vec<String>) {
    if cfg!(windows) {
        (
            std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".into()),
            Vec::new(),
        )
    } else {
        (
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into()),
            Vec::new(),
        )
    }
}
