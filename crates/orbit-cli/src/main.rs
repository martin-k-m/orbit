//! Orbit's terminal companion.
//!
//! `orbit` brings the engine that powers the desktop app to the shell. Every
//! command is a thin wrapper over [`orbit_core`], so the CLI and the app agree
//! on exactly what a "project", its health and its dependencies are.

mod ui;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use orbit_core::{deps, git, health, profile, scan};
use std::path::PathBuf;

/// Orbit — a local-first developer command center.
#[derive(Parser, Debug)]
#[command(name = "orbit", version, about, long_about = None)]
struct Cli {
    /// Emit machine-readable JSON instead of formatted text.
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
// The `Commands` variant intentionally shares the enum's name: it maps to the
// user-facing `orbit commands` subcommand.
#[allow(clippy::enum_variant_names)]
enum Commands {
    /// Scan a folder and list every project found inside it.
    Scan {
        /// The folder to scan (defaults to the current directory).
        path: Option<PathBuf>,
    },
    /// Show git, health and dependency detail for a single project.
    Info {
        /// The project directory (defaults to the current directory).
        path: Option<PathBuf>,
    },
    /// Grade a project's health.
    Health {
        /// The project directory (defaults to the current directory).
        path: Option<PathBuf>,
    },
    /// List a project's declared dependencies.
    Deps {
        /// The project directory (defaults to the current directory).
        path: Option<PathBuf>,
    },
    /// Show git status for a project.
    Git {
        /// The project directory (defaults to the current directory).
        path: Option<PathBuf>,
    },
    /// List the commands Orbit can run for a project.
    Commands {
        /// The project directory (defaults to the current directory).
        path: Option<PathBuf>,
    },
    /// Run one of a project's commands (e.g. `orbit run dev`).
    Run {
        /// The command name, such as `dev`, `test` or `build`.
        name: String,
        /// The project directory (defaults to the current directory).
        path: Option<PathBuf>,
        /// Skip the safety confirmation for commands flagged as dangerous.
        #[arg(long)]
        yes: bool,
    },
    /// Generate a `.project-orbit` profile for a project.
    Init {
        /// The project directory (defaults to the current directory).
        path: Option<PathBuf>,
        /// Overwrite an existing profile.
        #[arg(long)]
        force: bool,
    },
}

fn main() {
    if let Err(err) = run() {
        eprintln!("{} {err:#}", ui::error_badge());
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Scan { path } => cmd_scan(here(path)?, cli.json),
        Commands::Info { path } => cmd_info(here(path)?, cli.json),
        Commands::Health { path } => cmd_health(here(path)?, cli.json),
        Commands::Deps { path } => cmd_deps(here(path)?, cli.json),
        Commands::Git { path } => cmd_git(here(path)?, cli.json),
        Commands::Commands { path } => cmd_commands(here(path)?, cli.json),
        Commands::Run { name, path, yes } => cmd_run(here(path)?, &name, yes),
        Commands::Init { path, force } => cmd_init(here(path)?, force, cli.json),
    }
}

/// Resolve an optional path argument to an existing directory.
fn here(path: Option<PathBuf>) -> Result<PathBuf> {
    let path = path.unwrap_or_else(|| PathBuf::from("."));
    let path = path
        .canonicalize()
        .with_context(|| format!("no such directory: {}", path.display()))?;
    Ok(path)
}

fn cmd_scan(root: PathBuf, json: bool) -> Result<()> {
    let projects = scan::scan(&root).context("scan failed")?;
    if json {
        println!("{}", serde_json::to_string_pretty(&projects)?);
        return Ok(());
    }

    if projects.is_empty() {
        println!(
            "{} no projects found under {}",
            ui::warn_badge(),
            ui::dim(&root.display().to_string())
        );
        return Ok(());
    }

    println!(
        "{} {} project{} under {}\n",
        ui::ok_badge(),
        projects.len(),
        if projects.len() == 1 { "" } else { "s" },
        ui::dim(&root.display().to_string())
    );
    for project in &projects {
        ui::project_line(project);
    }
    Ok(())
}

fn cmd_info(path: PathBuf, json: bool) -> Result<()> {
    let detail = orbit_core::project_detail(&path)?
        .with_context(|| format!("{} is not a recognised project", path.display()))?;
    if json {
        println!("{}", serde_json::to_string_pretty(&detail)?);
        return Ok(());
    }
    ui::project_header(&detail.project);
    println!();
    ui::git_block(detail.git.as_ref());
    println!();
    ui::health_block(&detail.health);
    println!();
    ui::deps_block(&detail.dependencies);
    Ok(())
}

fn cmd_health(path: PathBuf, json: bool) -> Result<()> {
    let report = health::analyze_path(&path);
    if json {
        println!("{}", serde_json::to_string_pretty(&report)?);
        return Ok(());
    }
    ui::health_block(&report);
    Ok(())
}

fn cmd_deps(path: PathBuf, json: bool) -> Result<()> {
    let project = scan::analyze(&path)?
        .with_context(|| format!("{} is not a recognised project", path.display()))?;
    let dependencies: Vec<_> = project
        .ecosystems
        .iter()
        .flat_map(|eco| deps::list(&project.path, eco.language))
        .collect();
    if json {
        println!("{}", serde_json::to_string_pretty(&dependencies)?);
        return Ok(());
    }
    ui::deps_block(&dependencies);
    Ok(())
}

fn cmd_git(path: PathBuf, json: bool) -> Result<()> {
    let info = git::info(&path);
    if json {
        println!("{}", serde_json::to_string_pretty(&info)?);
        return Ok(());
    }
    ui::git_block(info.as_ref());
    Ok(())
}

fn cmd_commands(path: PathBuf, json: bool) -> Result<()> {
    let project = scan::analyze(&path)?
        .with_context(|| format!("{} is not a recognised project", path.display()))?;
    if json {
        println!("{}", serde_json::to_string_pretty(&project.commands)?);
        return Ok(());
    }
    ui::commands_block(&project.commands);
    Ok(())
}

fn cmd_run(path: PathBuf, name: &str, yes: bool) -> Result<()> {
    let project = scan::analyze(&path)?
        .with_context(|| format!("{} is not a recognised project", path.display()))?;
    let command = project
        .commands
        .iter()
        .find(|c| c.name == name)
        .with_context(|| {
            let available: Vec<_> = project.commands.iter().map(|c| c.name.as_str()).collect();
            format!(
                "unknown command `{name}`; available: {}",
                available.join(", ")
            )
        })?;

    // Safety gate: refuse to run destructive commands without an explicit --yes.
    let assessment = orbit_core::assess(&command.program, &command.args);
    if assessment.risk.requires_confirmation() && !yes {
        eprintln!(
            "{} {}",
            ui::warn_badge(),
            ui::bold("This command looks dangerous:")
        );
        for reason in &assessment.reasons {
            eprintln!("  {} {reason}", ui::warn_badge());
        }
        anyhow::bail!("refusing to run `{}` without --yes", command.display());
    }

    println!(
        "{} {} {}",
        ui::ok_badge(),
        ui::dim("running"),
        ui::bold(&command.display())
    );
    let output = orbit_core::process::run_to_completion(&project.path, command)?;
    print!("{}", output.stdout);
    eprint!("{}", output.stderr);
    if !output.success() {
        std::process::exit(output.code);
    }
    Ok(())
}

fn cmd_init(path: PathBuf, force: bool, json: bool) -> Result<()> {
    let project = scan::analyze(&path)?
        .with_context(|| format!("{} is not a recognised project", path.display()))?;
    let target = project.path.join(profile::PROFILE_FILE);
    if target.exists() && !force {
        anyhow::bail!(
            "{} already exists — pass --force to overwrite",
            profile::PROFILE_FILE
        );
    }
    let written = profile::write(&project.path, &project)?;
    if json {
        println!("{}", serde_json::json!({ "written": written }));
    } else {
        println!(
            "{} wrote {}",
            ui::ok_badge(),
            ui::bold(&written.display().to_string())
        );
    }
    Ok(())
}
