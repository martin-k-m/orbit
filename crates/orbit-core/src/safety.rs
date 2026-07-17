//! Command safety analysis.
//!
//! Orbit runs commands on the user's behalf, so before executing anything it
//! assesses how destructive that command looks and lets the surface (CLI or
//! desktop) decide whether to warn, require confirmation, or refuse. The
//! analysis is a fast, dependency-free heuristic over the program and its
//! arguments — it never executes anything itself.
//!
//! This is deliberately conservative: it is far better to ask the user to
//! confirm a harmless command than to silently run `rm -rf` against their home
//! directory.

use serde::{Deserialize, Serialize};

/// How risky a command looks.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Risk {
    /// Nothing concerning was detected.
    Safe,
    /// Potentially disruptive; the UI should note it but need not block.
    Caution,
    /// Destructive or irreversible; the UI must require explicit confirmation.
    Dangerous,
}

impl Risk {
    /// Whether Orbit should require the user to confirm before running.
    pub fn requires_confirmation(self) -> bool {
        matches!(self, Risk::Dangerous)
    }

    /// A short label for badges.
    pub fn label(self) -> &'static str {
        match self {
            Risk::Safe => "Safe",
            Risk::Caution => "Caution",
            Risk::Dangerous => "Dangerous",
        }
    }
}

/// The result of assessing a command.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Assessment {
    /// The overall risk level (the highest matched rule).
    pub risk: Risk,
    /// Human-readable reasons, one per matched rule.
    pub reasons: Vec<String>,
}

impl Assessment {
    fn safe() -> Self {
        Assessment {
            risk: Risk::Safe,
            reasons: Vec::new(),
        }
    }
}

/// Assess a program and its arguments for destructive intent.
///
/// The full command line is normalised to lowercase and matched against a set
/// of patterns covering the most common ways to lose data on Unix and Windows.
pub fn assess(program: &str, args: &[String]) -> Assessment {
    let line = normalise(program, args);
    let mut reasons: Vec<(Risk, String)> = Vec::new();

    // --- Recursive/forced deletion --------------------------------------
    if is_recursive_force_remove(&line) {
        reasons.push((
            Risk::Dangerous,
            "Recursive, forced file deletion (rm -rf / del /s /q / Remove-Item -Recurse -Force)"
                .into(),
        ));
    }
    if deletes_root_or_home(&line) {
        reasons.push((
            Risk::Dangerous,
            "Targets a root, home, or wildcard path — this can wipe large parts of the disk".into(),
        ));
    }

    // --- Disk / filesystem destruction ----------------------------------
    for (needle, why) in [
        ("mkfs", "Formats a filesystem"),
        ("format ", "Formats a drive"),
        ("diskpart", "Low-level disk partitioning"),
        (" dd ", "Raw disk write with dd"),
        ("if=/dev/zero", "Overwrites a device with dd"),
        ("of=/dev/", "Writes directly to a block device"),
        ("> /dev/sd", "Redirects output onto a raw disk device"),
        ("wipefs", "Erases filesystem signatures"),
    ] {
        if line.contains(needle) {
            reasons.push((Risk::Dangerous, why.into()));
        }
    }

    // --- Fork bomb -------------------------------------------------------
    if line.replace(' ', "").contains(":(){:|:&};:") {
        reasons.push((
            Risk::Dangerous,
            "Fork bomb — will exhaust system resources".into(),
        ));
    }

    // --- Piping the network into a shell --------------------------------
    if pipes_download_to_shell(&line) {
        reasons.push((
            Risk::Dangerous,
            "Downloads and executes a remote script (curl | sh) — runs unreviewed code".into(),
        ));
    }

    // --- Privilege escalation & broad permission changes ----------------
    if line.starts_with("sudo ") || line.contains(" sudo ") || program == "sudo" {
        reasons.push((Risk::Caution, "Runs with elevated privileges (sudo)".into()));
    }
    if line.contains("chmod 777") || line.contains("chmod -r 777") {
        reasons.push((
            Risk::Caution,
            "Grants world-writable permissions (chmod 777)".into(),
        ));
    }

    // --- History-rewriting / hard resets --------------------------------
    for (needle, why) in [
        (
            "git clean -fd",
            "git clean -fd removes untracked files irreversibly",
        ),
        (
            "git reset --hard",
            "git reset --hard discards uncommitted work",
        ),
        (
            "git push --force",
            "Force-push can overwrite remote history",
        ),
        ("git push -f", "Force-push can overwrite remote history"),
    ] {
        if line.contains(needle) {
            reasons.push((Risk::Caution, why.into()));
        }
    }

    // --- Shutdown / reboot ----------------------------------------------
    for needle in ["shutdown", "reboot", "halt "] {
        if line.starts_with(needle) || program == needle.trim() {
            reasons.push((Risk::Caution, "Powers off or restarts the machine".into()));
        }
    }

    if reasons.is_empty() {
        return Assessment::safe();
    }

    let risk = reasons.iter().map(|(r, _)| *r).max().unwrap_or(Risk::Safe);
    let mut seen = std::collections::BTreeSet::new();
    let reasons = reasons
        .into_iter()
        .map(|(_, why)| why)
        .filter(|why| seen.insert(why.clone()))
        .collect();
    Assessment { risk, reasons }
}

fn normalise(program: &str, args: &[String]) -> String {
    let mut line = String::from(program);
    for arg in args {
        line.push(' ');
        line.push_str(arg);
    }
    // Pad with spaces so `contains(" dd ")`-style word checks work at the edges.
    format!(" {} ", line.to_lowercase())
}

fn is_recursive_force_remove(line: &str) -> bool {
    // Unix: rm with both recursive and force flags, in any order/combination.
    let unix_rm = line.contains(" rm ")
        && (line.contains("-rf")
            || line.contains("-fr")
            || (line.contains(" -r") && line.contains(" -f")));
    // Windows cmd: del /s /q or /f, rd/rmdir /s
    let win_del = (line.contains(" del ") || line.contains(" erase "))
        && line.contains("/s")
        && (line.contains("/q") || line.contains("/f"));
    let win_rd = (line.contains(" rd ") || line.contains(" rmdir ")) && line.contains("/s");
    // PowerShell: Remove-Item -Recurse -Force
    let pwsh = line.contains("remove-item")
        && (line.contains("-recurse") || line.contains("-r "))
        && (line.contains("-force") || line.contains("-f "));
    unix_rm || win_del || win_rd || pwsh
}

fn deletes_root_or_home(line: &str) -> bool {
    // Only meaningful alongside a delete verb; check for scary targets.
    let is_delete = line.contains(" rm ")
        || line.contains(" del ")
        || line.contains(" rd ")
        || line.contains(" rmdir ")
        || line.contains("remove-item");
    if !is_delete {
        return false;
    }
    let scary = [
        " / ",
        " /*",
        " ~ ",
        " ~/",
        " ~/*",
        " $home",
        " %userprofile%",
        " c:\\",
        " c:/",
        " . ",
        " ./*",
        " * ",
    ];
    scary.iter().any(|t| line.contains(t))
}

fn pipes_download_to_shell(line: &str) -> bool {
    let downloads = line.contains("curl ")
        || line.contains("wget ")
        || line.contains("iwr ")
        || line.contains("invoke-webrequest");
    let to_shell = line.contains("| sh")
        || line.contains("| bash")
        || line.contains("|sh")
        || line.contains("|bash")
        || line.contains("| iex")
        || line.contains("invoke-expression");
    downloads && to_shell
}

#[cfg(test)]
mod tests {
    use super::*;

    fn a(program: &str, args: &[&str]) -> Assessment {
        assess(
            program,
            &args.iter().map(|s| s.to_string()).collect::<Vec<_>>(),
        )
    }

    #[test]
    fn ordinary_commands_are_safe() {
        assert_eq!(a("cargo", &["build", "--release"]).risk, Risk::Safe);
        assert_eq!(a("npm", &["run", "dev"]).risk, Risk::Safe);
        assert_eq!(a("go", &["test", "./..."]).risk, Risk::Safe);
        assert_eq!(a("git", &["status"]).risk, Risk::Safe);
    }

    #[test]
    fn recursive_force_delete_is_dangerous() {
        assert_eq!(a("rm", &["-rf", "build"]).risk, Risk::Dangerous);
        assert_eq!(a("rm", &["-fr", "node_modules"]).risk, Risk::Dangerous);
        assert_eq!(a("rm", &["-r", "-f", "dist"]).risk, Risk::Dangerous);
    }

    #[test]
    fn deleting_root_or_home_is_dangerous() {
        let assessment = a("rm", &["-rf", "/"]);
        assert_eq!(assessment.risk, Risk::Dangerous);
        assert!(assessment.risk.requires_confirmation());
        assert_eq!(a("rm", &["-rf", "~/"]).risk, Risk::Dangerous);
    }

    #[test]
    fn windows_and_powershell_deletes_flag() {
        assert_eq!(a("del", &["/s", "/q", "C:\\data"]).risk, Risk::Dangerous);
        assert_eq!(
            a(
                "powershell",
                &["Remove-Item", "-Recurse", "-Force", "C:\\x"]
            )
            .risk,
            Risk::Dangerous
        );
    }

    #[test]
    fn disk_and_forkbomb_and_pipe_to_shell() {
        assert_eq!(a("mkfs.ext4", &["/dev/sda1"]).risk, Risk::Dangerous);
        assert_eq!(
            a("dd", &["if=/dev/zero", "of=/dev/sda"]).risk,
            Risk::Dangerous
        );
        assert!(!a("curl", &["https://x.sh", "|", "sh"]).reasons.is_empty());
        assert_eq!(
            a("curl", &["https://x.sh", "|", "sh"]).risk,
            Risk::Dangerous
        );
    }

    #[test]
    fn sudo_and_chmod_are_caution() {
        assert_eq!(a("sudo", &["apt", "install", "curl"]).risk, Risk::Caution);
        assert_eq!(a("chmod", &["777", "file"]).risk, Risk::Caution);
        assert_eq!(a("git", &["reset", "--hard"]).risk, Risk::Caution);
    }

    #[test]
    fn reasons_are_deduplicated() {
        let assessment = a("rm", &["-rf", "/"]);
        let mut sorted = assessment.reasons.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(sorted.len(), assessment.reasons.len());
    }
}
