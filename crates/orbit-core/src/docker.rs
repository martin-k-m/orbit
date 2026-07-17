//! Docker integration.
//!
//! Like [`crate::git`], this shells out to the `docker` CLI the developer
//! already has rather than linking a client library. Everything degrades
//! gracefully: no Docker installed (or the daemon down) yields empty lists and
//! `available() == false`, never an error. Read helpers parse `--format
//! '{{json .}}'` output; the parsers are unit-tested, the process calls are not.

use crate::error::Error;
use serde::{Deserialize, Serialize};
use std::process::Command;

/// A container as shown in the Docker panel.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Container {
    pub id: String,
    pub name: String,
    pub image: String,
    /// `running`, `exited`, `paused`, `created`, …
    pub state: String,
    /// Human status, e.g. "Up 3 hours" or "Exited (0) 2 days ago".
    pub status: String,
    /// Port mappings, as Docker prints them.
    pub ports: String,
}

/// An image as shown in the Docker panel.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Image {
    pub id: String,
    pub repository: String,
    pub tag: String,
    pub size: String,
}

/// Whether the Docker CLI is present and its daemon reachable.
pub fn available() -> bool {
    run(&["version", "--format", "{{.Server.Version}}"])
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
}

/// All containers (running and stopped), newest first as Docker lists them.
pub fn containers() -> Vec<Container> {
    match run(&["ps", "-a", "--format", "{{json .}}"]) {
        Some(out) => parse_containers(&out),
        None => Vec::new(),
    }
}

/// All local images.
pub fn images() -> Vec<Image> {
    match run(&["images", "--format", "{{json .}}"]) {
        Some(out) => parse_images(&out),
        None => Vec::new(),
    }
}

/// Start a stopped container.
pub fn start(id: &str) -> crate::Result<()> {
    run_ok(&["start", id]).map(|_| ())
}

/// Stop a running container.
pub fn stop(id: &str) -> crate::Result<()> {
    run_ok(&["stop", id]).map(|_| ())
}

/// Restart a container.
pub fn restart(id: &str) -> crate::Result<()> {
    run_ok(&["restart", id]).map(|_| ())
}

// --- parsing ---------------------------------------------------------------

#[derive(Deserialize)]
struct RawContainer {
    #[serde(rename = "ID", default)]
    id: String,
    #[serde(rename = "Names", default)]
    names: String,
    #[serde(rename = "Image", default)]
    image: String,
    #[serde(rename = "State", default)]
    state: String,
    #[serde(rename = "Status", default)]
    status: String,
    #[serde(rename = "Ports", default)]
    ports: String,
}

fn parse_containers(output: &str) -> Vec<Container> {
    output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| serde_json::from_str::<RawContainer>(l).ok())
        .map(|r| Container {
            id: r.id,
            name: r.names,
            image: r.image,
            state: r.state,
            status: r.status,
            ports: r.ports,
        })
        .collect()
}

#[derive(Deserialize)]
struct RawImage {
    #[serde(rename = "ID", default)]
    id: String,
    #[serde(rename = "Repository", default)]
    repository: String,
    #[serde(rename = "Tag", default)]
    tag: String,
    #[serde(rename = "Size", default)]
    size: String,
}

fn parse_images(output: &str) -> Vec<Image> {
    output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| serde_json::from_str::<RawImage>(l).ok())
        .map(|r| Image {
            id: r.id,
            repository: r.repository,
            tag: r.tag,
            size: r.size,
        })
        .collect()
}

fn run(args: &[&str]) -> Option<String> {
    let output = Command::new("docker").args(args).output().ok()?;
    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        None
    }
}

fn run_ok(args: &[&str]) -> crate::Result<String> {
    let describe = || format!("docker {}", args.join(" "));
    let output = Command::new("docker")
        .args(args)
        .output()
        .map_err(|e| Error::Command {
            command: describe(),
            message: e.to_string(),
        })?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(Error::Command {
            command: describe(),
            message: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_container_json_lines() {
        // Two lines as `docker ps -a --format '{{json .}}'` prints them.
        let out = concat!(
            r#"{"ID":"abc123","Names":"web","Image":"nginx:latest","State":"running","Status":"Up 2 hours","Ports":"0.0.0.0:8080->80/tcp"}"#,
            "\n",
            r#"{"ID":"def456","Names":"db","Image":"postgres:16","State":"exited","Status":"Exited (0) 1 day ago","Ports":""}"#,
            "\n",
        );
        let cs = parse_containers(out);
        assert_eq!(cs.len(), 2);
        assert_eq!(cs[0].name, "web");
        assert_eq!(cs[0].image, "nginx:latest");
        assert_eq!(cs[0].state, "running");
        assert_eq!(cs[0].ports, "0.0.0.0:8080->80/tcp");
        assert_eq!(cs[1].name, "db");
        assert_eq!(cs[1].state, "exited");
    }

    #[test]
    fn parses_image_json_lines_and_skips_junk() {
        let out = concat!(
            r#"{"ID":"sha256:11","Repository":"nginx","Tag":"latest","Size":"187MB"}"#,
            "\n",
            "not json\n",
            r#"{"ID":"sha256:22","Repository":"postgres","Tag":"16","Size":"431MB"}"#,
            "\n",
        );
        let imgs = parse_images(out);
        assert_eq!(imgs.len(), 2, "the junk line is skipped");
        assert_eq!(imgs[0].repository, "nginx");
        assert_eq!(imgs[1].tag, "16");
    }

    #[test]
    fn empty_output_is_empty() {
        assert!(parse_containers("").is_empty());
        assert!(parse_images("\n  \n").is_empty());
    }
}
