//! Shell detection.
//!
//! The integrated terminal needs to know which shells exist on this machine and
//! which one the user actually wants. That's fiddlier than it sounds: `$SHELL`
//! is authoritative on Unix but absent on Windows, `COMSPEC` points at cmd.exe,
//! PowerShell comes in two incompatible flavours (`pwsh` and `powershell`), and
//! any of them may simply not be installed.
//!
//! The policy here:
//!
//! 1. Respect the user's explicit choice (`$SHELL`, or `COMSPEC` on Windows).
//! 2. Otherwise prefer the best shell that is actually installed, per platform.
//! 3. Always fall back to something that exists (`sh` / `cmd.exe`).
//!
//! The classification and preference logic is pure and unit-tested; only
//! [`available`] and [`preferred`] touch the environment.

use serde::{Deserialize, Serialize};

/// A shell Orbit knows how to launch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShellKind {
    /// PowerShell 7+ (`pwsh`) — cross-platform.
    PowerShell,
    /// Windows PowerShell 5.1 (`powershell.exe`).
    WindowsPowerShell,
    /// The classic Windows command prompt.
    Cmd,
    /// Git Bash / WSL bash / Linux bash.
    Bash,
    /// Z shell — the macOS default since Catalina.
    Zsh,
    /// Fish.
    Fish,
    /// POSIX sh — the universal fallback.
    Sh,
    /// Nushell.
    Nu,
    /// Anything we don't recognise.
    Other,
}

impl ShellKind {
    /// A human label for the UI.
    pub fn label(self) -> &'static str {
        match self {
            ShellKind::PowerShell => "PowerShell",
            ShellKind::WindowsPowerShell => "Windows PowerShell",
            ShellKind::Cmd => "Command Prompt",
            ShellKind::Bash => "Bash",
            ShellKind::Zsh => "Zsh",
            ShellKind::Fish => "Fish",
            ShellKind::Sh => "sh",
            ShellKind::Nu => "Nushell",
            ShellKind::Other => "Shell",
        }
    }

    /// Classify a shell from its program name or full path.
    ///
    /// Handles `/bin/zsh`, `C:\Windows\System32\cmd.exe`, `pwsh`, and friends.
    pub fn classify(program: &str) -> Self {
        let name = program
            .replace('\\', "/")
            .rsplit('/')
            .next()
            .unwrap_or(program)
            .to_lowercase();
        let name = name.strip_suffix(".exe").unwrap_or(&name).to_string();
        match name.as_str() {
            "pwsh" | "pwsh-preview" => ShellKind::PowerShell,
            "powershell" => ShellKind::WindowsPowerShell,
            "cmd" => ShellKind::Cmd,
            "bash" => ShellKind::Bash,
            "zsh" => ShellKind::Zsh,
            "fish" => ShellKind::Fish,
            "sh" | "dash" => ShellKind::Sh,
            "nu" => ShellKind::Nu,
            _ => ShellKind::Other,
        }
    }

    /// The arguments needed to start an interactive login session.
    pub fn interactive_args(self) -> Vec<String> {
        match self {
            // -l gives a login shell so the user's profile (PATH, aliases) loads.
            ShellKind::Bash | ShellKind::Zsh => vec!["-l".to_string()],
            // PowerShell's banner is noise in an embedded terminal.
            ShellKind::PowerShell | ShellKind::WindowsPowerShell => vec!["-NoLogo".to_string()],
            _ => Vec::new(),
        }
    }
}

/// A launchable shell.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Shell {
    /// What to show in the UI, e.g. "Zsh".
    pub label: String,
    /// The program to execute (a full path when we resolved one).
    pub program: String,
    /// Arguments for an interactive session.
    pub args: Vec<String>,
    /// Which shell this is.
    pub kind: ShellKind,
}

impl Shell {
    /// Build a [`Shell`] from a program name or path, classifying it.
    pub fn from_program(program: impl Into<String>) -> Self {
        let program = program.into();
        let kind = ShellKind::classify(&program);
        Shell {
            label: kind.label().to_string(),
            args: kind.interactive_args(),
            program,
            kind,
        }
    }
}

/// The candidate shells for this platform, best first.
///
/// Order encodes preference: on Windows a user with PowerShell 7 installed
/// almost certainly wants it over cmd.exe; on macOS zsh is the modern default.
fn candidates() -> &'static [&'static str] {
    #[cfg(target_os = "windows")]
    {
        &["pwsh.exe", "powershell.exe", "cmd.exe"]
    }
    #[cfg(target_os = "macos")]
    {
        &[
            "/bin/zsh",
            "/opt/homebrew/bin/fish",
            "/usr/local/bin/fish",
            "/bin/bash",
            "/bin/sh",
        ]
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        &[
            "/usr/bin/fish",
            "/usr/bin/zsh",
            "/bin/zsh",
            "/usr/bin/bash",
            "/bin/bash",
            "/bin/sh",
        ]
    }
}

/// Whether a program exists — an absolute path that exists, or a bare name
/// found on `PATH`.
fn exists(program: &str) -> bool {
    let path = std::path::Path::new(program);
    if path.is_absolute() {
        return path.is_file();
    }
    let Some(paths) = std::env::var_os("PATH") else {
        return false;
    };
    std::env::split_paths(&paths).any(|dir| dir.join(program).is_file())
}

/// Every shell actually installed on this machine, best first.
///
/// The user's `$SHELL` (or `COMSPEC`) is promoted to the front when set, since
/// an explicit choice beats our ordering.
pub fn available() -> Vec<Shell> {
    let mut shells: Vec<Shell> = Vec::new();

    if let Some(chosen) = from_env() {
        if exists(&chosen.program) {
            shells.push(chosen);
        }
    }

    for candidate in candidates() {
        if !exists(candidate) {
            continue;
        }
        let shell = Shell::from_program(*candidate);
        // Don't list the same kind twice (e.g. $SHELL=/bin/zsh and /bin/zsh).
        if shells.iter().any(|s| s.kind == shell.kind) {
            continue;
        }
        shells.push(shell);
    }

    if shells.is_empty() {
        shells.push(fallback());
    }
    shells
}

/// The shell Orbit should open by default.
pub fn preferred() -> Shell {
    available().into_iter().next().unwrap_or_else(fallback)
}

/// Read the user's explicitly configured shell from the environment.
fn from_env() -> Option<Shell> {
    let var = if cfg!(windows) { "COMSPEC" } else { "SHELL" };
    let value = std::env::var(var).ok()?;
    if value.trim().is_empty() {
        return None;
    }
    Some(Shell::from_program(value))
}

/// The shell that always exists.
fn fallback() -> Shell {
    if cfg!(windows) {
        Shell::from_program("cmd.exe")
    } else {
        Shell::from_program("/bin/sh")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_unix_shells_from_paths() {
        assert_eq!(ShellKind::classify("/bin/zsh"), ShellKind::Zsh);
        assert_eq!(ShellKind::classify("/usr/bin/bash"), ShellKind::Bash);
        assert_eq!(ShellKind::classify("/usr/local/bin/fish"), ShellKind::Fish);
        assert_eq!(ShellKind::classify("/bin/sh"), ShellKind::Sh);
        assert_eq!(ShellKind::classify("nu"), ShellKind::Nu);
    }

    #[test]
    fn classifies_windows_shells_including_exe_and_backslashes() {
        assert_eq!(
            ShellKind::classify("C:\\Windows\\System32\\cmd.exe"),
            ShellKind::Cmd
        );
        assert_eq!(ShellKind::classify("pwsh.exe"), ShellKind::PowerShell);
        assert_eq!(
            ShellKind::classify("C:\\Program Files\\PowerShell\\7\\pwsh.exe"),
            ShellKind::PowerShell
        );
        // Windows PowerShell 5.1 is a different beast from pwsh 7.
        assert_eq!(
            ShellKind::classify("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"),
            ShellKind::WindowsPowerShell
        );
    }

    #[test]
    fn classification_is_case_insensitive() {
        assert_eq!(ShellKind::classify("CMD.EXE"), ShellKind::Cmd);
        assert_eq!(ShellKind::classify("/bin/ZSH"), ShellKind::Zsh);
    }

    #[test]
    fn unknown_programs_classify_as_other() {
        assert_eq!(ShellKind::classify("/usr/bin/python"), ShellKind::Other);
        assert_eq!(ShellKind::classify(""), ShellKind::Other);
    }

    #[test]
    fn interactive_args_load_the_user_profile() {
        // Login shells so PATH/aliases from the user's profile are present.
        assert_eq!(ShellKind::Bash.interactive_args(), vec!["-l"]);
        assert_eq!(ShellKind::Zsh.interactive_args(), vec!["-l"]);
        // PowerShell's banner is noise inside an embedded terminal.
        assert_eq!(ShellKind::PowerShell.interactive_args(), vec!["-NoLogo"]);
        // cmd and fish take nothing.
        assert!(ShellKind::Cmd.interactive_args().is_empty());
        assert!(ShellKind::Fish.interactive_args().is_empty());
    }

    #[test]
    fn shell_from_program_fills_label_and_args() {
        let shell = Shell::from_program("/bin/zsh");
        assert_eq!(shell.kind, ShellKind::Zsh);
        assert_eq!(shell.label, "Zsh");
        assert_eq!(shell.args, vec!["-l"]);
        assert_eq!(shell.program, "/bin/zsh");
    }

    #[test]
    fn available_always_returns_something_launchable() {
        // Whatever the machine, we must be able to open *a* terminal.
        let shells = available();
        assert!(!shells.is_empty());
        assert!(shells.iter().all(|s| !s.program.is_empty()));
    }

    #[test]
    fn preferred_is_the_first_available() {
        let preferred = preferred();
        let first = available().into_iter().next().unwrap();
        assert_eq!(preferred, first);
    }

    #[test]
    fn available_lists_each_shell_kind_once() {
        let shells = available();
        let mut kinds: Vec<ShellKind> = shells.iter().map(|s| s.kind).collect();
        let before = kinds.len();
        kinds.sort();
        kinds.dedup();
        assert_eq!(kinds.len(), before, "duplicate shell kinds in {shells:?}");
    }

    #[test]
    fn fallback_is_platform_appropriate() {
        let shell = fallback();
        if cfg!(windows) {
            assert_eq!(shell.kind, ShellKind::Cmd);
        } else {
            assert_eq!(shell.kind, ShellKind::Sh);
        }
    }
}
