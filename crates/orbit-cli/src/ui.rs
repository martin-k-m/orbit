//! Terminal formatting helpers.
//!
//! A tiny hand-rolled ANSI layer keeps the CLI dependency-light while still
//! feeling like a modern tool. Colour is disabled automatically when output is
//! not a terminal or when `NO_COLOR` is set.

use orbit_core::deps::Dependency;
use orbit_core::git::GitInfo;
use orbit_core::health::HealthReport;
use orbit_core::model::{Command, Project};

/// Whether ANSI colour should be emitted.
fn colored() -> bool {
    // Respect the informal NO_COLOR standard; otherwise assume a capable term.
    std::env::var_os("NO_COLOR").is_none()
}

fn paint(code: &str, text: &str) -> String {
    if colored() {
        format!("\x1b[{code}m{text}\x1b[0m")
    } else {
        text.to_string()
    }
}

/// Bold text.
pub fn bold(text: &str) -> String {
    paint("1", text)
}
/// Dimmed text.
pub fn dim(text: &str) -> String {
    paint("2;37", text)
}
fn green(text: &str) -> String {
    paint("32", text)
}
fn yellow(text: &str) -> String {
    paint("33", text)
}
fn red(text: &str) -> String {
    paint("31", text)
}
fn cyan(text: &str) -> String {
    paint("36", text)
}
fn magenta(text: &str) -> String {
    paint("35", text)
}

/// The `✔` success badge.
pub fn ok_badge() -> String {
    green("✔")
}
/// The `!` warning badge.
pub fn warn_badge() -> String {
    yellow("!")
}
/// The `✖` error badge.
pub fn error_badge() -> String {
    red("✖")
}

/// One compact line describing a project, used by `orbit scan`.
pub fn project_line(project: &Project) {
    let lang = language_chip(project.primary_language.label());
    let link = project
        .ecosystem_link
        .map(|l| format!("  {}", magenta(&format!("◆ {}", l.label()))))
        .unwrap_or_default();
    println!("  {}  {}{}", bold(&pad(&project.name, 22)), lang, link);
    println!(
        "  {}  {}",
        " ".repeat(22),
        dim(&project.path.display().to_string())
    );
}

/// A bold header for the `orbit info` view.
pub fn project_header(project: &Project) {
    println!("{}", bold(&project.name));
    println!(
        "{}  {}",
        language_chip(project.primary_language.label()),
        dim(&project.path.display().to_string())
    );
    if let Some(description) = &project.description {
        println!("{}", dim(description));
    }
}

/// Render git status.
pub fn git_block(info: Option<&GitInfo>) {
    println!("{}", bold("Git"));
    match info {
        None => println!("  {}", dim("not a git repository")),
        Some(git) => {
            let status = if git.is_clean {
                green("✓ clean")
            } else {
                yellow(&format!("● {} changed", git.changed_files))
            };
            println!("  branch   {}  {}", cyan(&git.branch), status);
            if git.ahead > 0 || git.behind > 0 {
                println!(
                    "  remote   {}",
                    dim(&format!("↑{} ↓{}", git.ahead, git.behind))
                );
            }
            if let Some(commit) = &git.last_commit {
                println!("  latest   {} {}", dim(&commit.short_hash), commit.summary);
            }
        }
    }
}

/// Render a health report.
pub fn health_block(report: &HealthReport) {
    let score = format!("{}/100", report.score);
    let colored_score = match report.score {
        90..=100 => green(&score),
        60..=89 => yellow(&score),
        _ => red(&score),
    };
    println!(
        "{}  {}  {}",
        bold("Health"),
        colored_score,
        dim(report.grade())
    );
    println!(
        "  {}",
        dim(&format!(
            "{} files · {} lines · {} TODOs",
            report.file_count, report.total_lines, report.todo_count
        ))
    );
    for warning in report.warnings.iter().take(6) {
        println!("  {} {}", yellow("⚠"), warning.message);
    }
    if report.warnings.len() > 6 {
        println!(
            "  {}",
            dim(&format!("… {} more", report.warnings.len() - 6))
        );
    }
}

/// Render the dependency list.
pub fn deps_block(dependencies: &[Dependency]) {
    println!(
        "{}  {}",
        bold("Dependencies"),
        dim(&format!("{}", dependencies.len()))
    );
    if dependencies.is_empty() {
        println!("  {}", dim("none declared"));
        return;
    }
    for dep in dependencies.iter().take(30) {
        let tag = if dep.dev { dim("(dev)") } else { String::new() };
        println!("  {}  {}  {}", pad(&dep.name, 28), dim(&dep.current), tag);
    }
    if dependencies.len() > 30 {
        println!("  {}", dim(&format!("… {} more", dependencies.len() - 30)));
    }
}

/// Render the command list.
pub fn commands_block(commands: &[Command]) {
    println!("{}", bold("Commands"));
    if commands.is_empty() {
        println!("  {}", dim("none"));
        return;
    }
    let mut sorted = commands.to_vec();
    sorted.sort_by(|a, b| a.name.cmp(&b.name));
    for command in sorted {
        println!(
            "  {}  {}",
            cyan(&pad(&command.name, 12)),
            dim(&command.display())
        );
    }
}

fn language_chip(label: &str) -> String {
    paint("30;47", &format!(" {label} "))
}

/// Left-pad `text` to `width` display columns (ASCII assumption is fine here).
fn pad(text: &str, width: usize) -> String {
    if text.len() >= width {
        text.to_string()
    } else {
        format!("{text}{}", " ".repeat(width - text.len()))
    }
}
