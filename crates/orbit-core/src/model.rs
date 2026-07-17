//! The core data model shared by the engine, the CLI and the desktop app.
//!
//! Everything here is `serde`-serializable with `camelCase` field names so it
//! crosses the Tauri IPC boundary into TypeScript without any translation
//! layer. Keeping a single source of truth for these shapes is what lets the
//! Rust core and the React frontend stay in lock-step.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A programming language or ecosystem Orbit knows how to work with.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Language {
    /// Rust — detected via `Cargo.toml`.
    Rust,
    /// TypeScript — a `package.json` project using TypeScript.
    TypeScript,
    /// JavaScript — a `package.json` project without TypeScript.
    JavaScript,
    /// Python — `pyproject.toml` or `requirements.txt`.
    Python,
    /// Go — `go.mod`.
    Go,
    /// A container-first project — `docker-compose.yml` / `Dockerfile`.
    Docker,
    /// Anything we could not classify.
    Unknown,
}

impl Language {
    /// A short, human-facing label.
    pub fn label(self) -> &'static str {
        match self {
            Language::Rust => "Rust",
            Language::TypeScript => "TypeScript",
            Language::JavaScript => "JavaScript",
            Language::Python => "Python",
            Language::Go => "Go",
            Language::Docker => "Docker",
            Language::Unknown => "Unknown",
        }
    }

    /// The brand colour used to tint the language in the UI (hex, no `#`).
    pub fn color(self) -> &'static str {
        match self {
            Language::Rust => "f74c00",
            Language::TypeScript => "3178c6",
            Language::JavaScript => "f7df1e",
            Language::Python => "3776ab",
            Language::Go => "00add8",
            Language::Docker => "2496ed",
            Language::Unknown => "8b8b8b",
        }
    }
}

/// A runnable command Orbit has discovered or that a user configured.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    /// A stable key such as `dev`, `test`, `build`.
    pub name: String,
    /// The program to spawn (e.g. `cargo`, `npm`, `docker`).
    pub program: String,
    /// Arguments passed to the program.
    pub args: Vec<String>,
    /// A short description shown in the UI.
    #[serde(default)]
    pub description: Option<String>,
    /// How Orbit learned about this command.
    pub source: CommandSource,
}

impl Command {
    /// Build a command from a whitespace-joined string like `cargo run`.
    ///
    /// The first token becomes the program, the rest become arguments. This is
    /// how commands are stored in the human-editable `.project-orbit` file.
    pub fn parse(name: impl Into<String>, line: &str, source: CommandSource) -> Option<Self> {
        let mut parts = line.split_whitespace();
        let program = parts.next()?.to_string();
        let args = parts.map(str::to_string).collect();
        Some(Command {
            name: name.into(),
            program,
            args,
            description: None,
            source,
        })
    }

    /// Render the command back to a display string (`cargo run --release`).
    pub fn display(&self) -> String {
        if self.args.is_empty() {
            self.program.clone()
        } else {
            format!("{} {}", self.program, self.args.join(" "))
        }
    }
}

/// Where a [`Command`] came from — drives how much we trust it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CommandSource {
    /// Inferred from the ecosystem's manifest (e.g. a `package.json` script).
    Detected,
    /// Written by the user in `.project-orbit`.
    Profile,
    /// A convention Orbit assumes for the language (e.g. `cargo build`).
    Convention,
}

/// A single ecosystem's fingerprint inside a project directory.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ecosystem {
    /// The language this manifest represents.
    pub language: Language,
    /// A framework hint if one was recognised (e.g. `Next.js`, `Axum`).
    #[serde(default)]
    pub framework: Option<String>,
    /// The manifest file that triggered detection, relative to the project.
    pub manifest: String,
    /// Commands surfaced by this ecosystem.
    pub commands: Vec<Command>,
}

/// A detected project. This is the central entity in Orbit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    /// A stable identifier derived from the absolute path.
    pub id: String,
    /// The display name (folder name, or profile-provided name).
    pub name: String,
    /// Absolute path to the project root.
    pub path: PathBuf,
    /// The dominant language, used for grouping and colour.
    pub primary_language: Language,
    /// Every ecosystem detected inside the project.
    pub ecosystems: Vec<Ecosystem>,
    /// The union of all runnable commands, de-duplicated by name.
    pub commands: Vec<Command>,
    /// A one-line description from the project profile, if any.
    #[serde(default)]
    pub description: Option<String>,
    /// Whether a `.project-orbit` profile is present.
    pub has_profile: bool,
    /// The number of direct dependencies detected (best effort).
    #[serde(default)]
    pub dependency_count: usize,
    /// A known ecosystem sibling (Blink/Killer/Flux/Beacon) if recognised.
    #[serde(default)]
    pub ecosystem_link: Option<EcosystemLink>,
}

impl Project {
    /// Compute the stable id Orbit uses for a project at `path`.
    ///
    /// We use a FNV-1a hash of the normalised absolute path so the same folder
    /// always maps to the same id across scans and machines-with-same-layout,
    /// without pulling in a cryptographic hashing dependency.
    pub fn id_for_path(path: &std::path::Path) -> String {
        let normalized = path.to_string_lossy().replace('\\', "/").to_lowercase();
        let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
        for byte in normalized.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        }
        format!("{hash:016x}")
    }
}

/// A sibling product in the Orbit ecosystem that a project belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EcosystemLink {
    /// Blink — developer acceleration toolkit.
    Blink,
    /// Killer — security platform.
    Killer,
    /// Flux — automation platform.
    Flux,
    /// Beacon — developer API / web platform.
    Beacon,
}

impl EcosystemLink {
    /// Human label for the sibling product.
    pub fn label(self) -> &'static str {
        match self {
            EcosystemLink::Blink => "Blink",
            EcosystemLink::Killer => "Killer",
            EcosystemLink::Flux => "Flux",
            EcosystemLink::Beacon => "Beacon",
        }
    }
}
