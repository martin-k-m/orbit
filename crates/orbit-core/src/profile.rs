//! Reading and writing the `.project-orbit` profile.
//!
//! The profile is a small, human-editable TOML file that lets a developer
//! pin a project's name and the exact commands Orbit should run, overriding
//! anything the detector guessed. Orbit can generate one from a scan.

use crate::model::{Command, CommandSource, Project};
use crate::{Error, Result};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

/// The on-disk filename for a project profile.
pub const PROFILE_FILE: &str = ".project-orbit";

/// A parsed project profile.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Profile {
    /// Display name override.
    pub name: Option<String>,
    /// One-line description.
    pub description: Option<String>,
    /// User-defined commands (already normalised into [`Command`]s).
    pub commands: Vec<Command>,
}

/// The raw TOML shape. We keep this separate from [`Profile`] so the public
/// type does not leak the wire format.
#[derive(Debug, Serialize, Deserialize)]
struct RawProfile {
    project: RawProject,
    #[serde(default)]
    commands: BTreeMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RawProject {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    description: Option<String>,
}

/// Load the profile from `dir`, returning `Ok(None)` if there isn't one.
pub fn load(dir: &Path) -> Result<Option<Profile>> {
    let path = dir.join(PROFILE_FILE);
    if !path.is_file() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| Error::io(&path, e))?;
    Ok(Some(parse(&raw)?))
}

/// Parse profile TOML from a string.
pub fn parse(raw: &str) -> Result<Profile> {
    let raw: RawProfile = toml::from_str(raw).map_err(|e| Error::Profile(e.to_string()))?;
    let commands = raw
        .commands
        .into_iter()
        .filter_map(|(name, line)| Command::parse(name, &line, CommandSource::Profile))
        .collect();
    Ok(Profile {
        name: raw.project.name,
        description: raw.project.description,
        commands,
    })
}

/// Serialise a project into profile TOML.
///
/// This is what powers "Initialize project": we take a scanned [`Project`] and
/// emit a profile capturing its name and detected commands so the developer can
/// then edit it by hand.
pub fn render(project: &Project) -> String {
    let mut out = String::new();
    out.push_str("# Orbit project profile — https://orbit.blinkdev.me/docs/profiles\n");
    out.push_str("[project]\n");
    out.push_str(&format!("name = {}\n", toml_string(&project.name)));
    if let Some(description) = &project.description {
        out.push_str(&format!("description = {}\n", toml_string(description)));
    }
    out.push('\n');
    out.push_str("[commands]\n");
    if project.commands.is_empty() {
        out.push_str("# dev = \"cargo run\"\n");
    } else {
        // Stable, alphabetical ordering keeps generated files diff-friendly.
        let mut commands = project.commands.clone();
        commands.sort_by(|a, b| a.name.cmp(&b.name));
        for command in commands {
            out.push_str(&format!(
                "{} = {}\n",
                command.name,
                toml_string(&command.display())
            ));
        }
    }
    out
}

/// Write a generated profile into `dir`, returning the path written.
pub fn write(dir: &Path, project: &Project) -> Result<std::path::PathBuf> {
    let path = dir.join(PROFILE_FILE);
    std::fs::write(&path, render(project)).map_err(|e| Error::io(&path, e))?;
    Ok(path)
}

/// Escape a value as a TOML basic string.
fn toml_string(value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{escaped}\"")
}
