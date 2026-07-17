//! Ecosystem detection.
//!
//! Given a project directory, figure out which languages and frameworks live
//! there and what commands a developer would want to run. Detection is
//! deliberately manifest-driven: a project is defined by the files that build
//! tools look for (`Cargo.toml`, `package.json`, `go.mod`, …).

use crate::model::{Command, CommandSource, Ecosystem, Language};
use std::path::Path;

/// The manifest filenames that mark the root of a project.
///
/// Used by the scanner to decide whether a directory is a project without
/// paying to fully analyse it.
pub const ROOT_MARKERS: &[&str] = &[
    "Cargo.toml",
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "go.mod",
    "docker-compose.yml",
    "docker-compose.yaml",
];

/// Detect every ecosystem present in `dir` (non-recursively).
///
/// Returns one [`Ecosystem`] per manifest found. The list is ordered by the
/// manifest we consider most "primary" first, which the caller uses to choose
/// the project's dominant language.
pub fn detect(dir: &Path) -> Vec<Ecosystem> {
    let mut found = Vec::new();

    if dir.join("Cargo.toml").is_file() {
        found.push(detect_rust(dir));
    }
    if dir.join("package.json").is_file() {
        found.push(detect_node(dir));
    }
    if dir.join("pyproject.toml").is_file() || dir.join("requirements.txt").is_file() {
        found.push(detect_python(dir));
    }
    if dir.join("go.mod").is_file() {
        found.push(detect_go(dir));
    }
    if dir.join("docker-compose.yml").is_file() || dir.join("docker-compose.yaml").is_file() {
        found.push(detect_docker(dir));
    }

    found
}

fn read(dir: &Path, name: &str) -> Option<String> {
    std::fs::read_to_string(dir.join(name)).ok()
}

fn detect_rust(dir: &Path) -> Ecosystem {
    let manifest = read(dir, "Cargo.toml").unwrap_or_default();
    let is_workspace = manifest.contains("[workspace]");
    let framework = rust_framework(&manifest);

    let mut commands = vec![
        cmd(
            "dev",
            "cargo",
            &["run"],
            CommandSource::Convention,
            "Run the app",
        ),
        cmd(
            "test",
            "cargo",
            &["test"],
            CommandSource::Convention,
            "Run tests",
        ),
        cmd(
            "build",
            "cargo",
            &["build", "--release"],
            CommandSource::Convention,
            "Release build",
        ),
        cmd(
            "check",
            "cargo",
            &["check"],
            CommandSource::Convention,
            "Type-check",
        ),
        cmd(
            "lint",
            "cargo",
            &["clippy"],
            CommandSource::Convention,
            "Lint with Clippy",
        ),
    ];
    if is_workspace {
        // A virtual workspace has no default `run` target.
        commands.retain(|c| c.name != "dev");
    }

    Ecosystem {
        language: Language::Rust,
        framework,
        manifest: "Cargo.toml".into(),
        commands,
    }
}

fn rust_framework(manifest: &str) -> Option<String> {
    const HINTS: &[(&str, &str)] = &[
        ("tauri", "Tauri"),
        ("axum", "Axum"),
        ("actix-web", "Actix"),
        ("rocket", "Rocket"),
        ("bevy", "Bevy"),
        ("leptos", "Leptos"),
        ("dioxus", "Dioxus"),
    ];
    HINTS
        .iter()
        .find(|(dep, _)| manifest.contains(dep))
        .map(|(_, name)| name.to_string())
}

fn detect_node(dir: &Path) -> Ecosystem {
    let raw = read(dir, "package.json").unwrap_or_default();
    let json: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);

    let has_ts = dir.join("tsconfig.json").is_file()
        || dependency_present(&json, "typescript")
        || raw.contains("\"types\"");
    let language = if has_ts {
        Language::TypeScript
    } else {
        Language::JavaScript
    };

    let framework = node_framework(&json);
    let runner = node_runner(dir);

    // Turn every `scripts` entry into a first-class command.
    let mut commands = Vec::new();
    if let Some(scripts) = json.get("scripts").and_then(|s| s.as_object()) {
        for name in scripts.keys() {
            commands.push(Command {
                name: name.clone(),
                program: runner.to_string(),
                args: vec!["run".into(), name.clone()],
                description: Some(format!("npm script: {name}")),
                source: CommandSource::Detected,
            });
        }
    }
    // Always make sure the common trio exists even if scripts are missing.
    ensure(&mut commands, "dev", runner);
    ensure(&mut commands, "build", runner);
    ensure(&mut commands, "test", runner);

    Ecosystem {
        language,
        framework,
        manifest: "package.json".into(),
        commands,
    }
}

fn node_runner(dir: &Path) -> &'static str {
    if dir.join("pnpm-lock.yaml").is_file() {
        "pnpm"
    } else if dir.join("yarn.lock").is_file() {
        "yarn"
    } else if dir.join("bun.lockb").is_file() {
        "bun"
    } else {
        "npm"
    }
}

fn node_framework(json: &serde_json::Value) -> Option<String> {
    const HINTS: &[(&str, &str)] = &[
        ("next", "Next.js"),
        ("nuxt", "Nuxt"),
        ("@remix-run/react", "Remix"),
        ("@sveltejs/kit", "SvelteKit"),
        ("astro", "Astro"),
        ("vite", "Vite"),
        ("react", "React"),
        ("vue", "Vue"),
        ("svelte", "Svelte"),
        ("@angular/core", "Angular"),
        ("express", "Express"),
        ("fastify", "Fastify"),
        ("@nestjs/core", "NestJS"),
    ];
    HINTS
        .iter()
        .find(|(dep, _)| dependency_present(json, dep))
        .map(|(_, name)| name.to_string())
}

fn dependency_present(json: &serde_json::Value, name: &str) -> bool {
    ["dependencies", "devDependencies", "peerDependencies"]
        .iter()
        .any(|section| {
            json.get(section)
                .and_then(|d| d.as_object())
                .is_some_and(|deps| deps.contains_key(name))
        })
}

fn detect_python(dir: &Path) -> Ecosystem {
    let has_pyproject = dir.join("pyproject.toml").is_file();
    let pyproject = read(dir, "pyproject.toml").unwrap_or_default();
    let framework = python_framework(dir, &pyproject);

    let manifest = if has_pyproject {
        "pyproject.toml"
    } else {
        "requirements.txt"
    };

    let uses_poetry = pyproject.contains("[tool.poetry]");
    let mut commands = vec![
        cmd(
            "test",
            "pytest",
            &[],
            CommandSource::Convention,
            "Run tests",
        ),
        cmd(
            "lint",
            "ruff",
            &["check", "."],
            CommandSource::Convention,
            "Lint with Ruff",
        ),
    ];
    if uses_poetry {
        commands.insert(
            0,
            cmd(
                "install",
                "poetry",
                &["install"],
                CommandSource::Convention,
                "Install deps",
            ),
        );
    } else if !has_pyproject {
        commands.insert(
            0,
            cmd(
                "install",
                "pip",
                &["install", "-r", "requirements.txt"],
                CommandSource::Convention,
                "Install deps",
            ),
        );
    }

    Ecosystem {
        language: Language::Python,
        framework,
        manifest: manifest.into(),
        commands,
    }
}

fn python_framework(dir: &Path, pyproject: &str) -> Option<String> {
    let requirements = read(dir, "requirements.txt").unwrap_or_default();
    let haystack = format!("{pyproject}\n{requirements}").to_lowercase();
    const HINTS: &[(&str, &str)] = &[
        ("django", "Django"),
        ("flask", "Flask"),
        ("fastapi", "FastAPI"),
        ("torch", "PyTorch"),
        ("tensorflow", "TensorFlow"),
        ("streamlit", "Streamlit"),
    ];
    HINTS
        .iter()
        .find(|(dep, _)| haystack.contains(dep))
        .map(|(_, name)| name.to_string())
}

fn detect_go(dir: &Path) -> Ecosystem {
    let manifest = read(dir, "go.mod").unwrap_or_default();
    let framework = go_framework(&manifest);
    Ecosystem {
        language: Language::Go,
        framework,
        manifest: "go.mod".into(),
        commands: vec![
            cmd("dev", "go", &["run", "."], CommandSource::Convention, "Run"),
            cmd(
                "test",
                "go",
                &["test", "./..."],
                CommandSource::Convention,
                "Run tests",
            ),
            cmd(
                "build",
                "go",
                &["build", "./..."],
                CommandSource::Convention,
                "Build",
            ),
        ],
    }
}

fn go_framework(manifest: &str) -> Option<String> {
    const HINTS: &[(&str, &str)] = &[
        ("gin-gonic/gin", "Gin"),
        ("labstack/echo", "Echo"),
        ("gofiber/fiber", "Fiber"),
        ("go-chi/chi", "Chi"),
    ];
    HINTS
        .iter()
        .find(|(dep, _)| manifest.contains(dep))
        .map(|(_, name)| name.to_string())
}

fn detect_docker(dir: &Path) -> Ecosystem {
    let manifest = if dir.join("docker-compose.yml").is_file() {
        "docker-compose.yml"
    } else {
        "docker-compose.yaml"
    };
    Ecosystem {
        language: Language::Docker,
        framework: Some("Compose".into()),
        manifest: manifest.into(),
        commands: vec![
            cmd(
                "up",
                "docker",
                &["compose", "up", "-d"],
                CommandSource::Convention,
                "Start services",
            ),
            cmd(
                "down",
                "docker",
                &["compose", "down"],
                CommandSource::Convention,
                "Stop services",
            ),
            cmd(
                "logs",
                "docker",
                &["compose", "logs", "-f"],
                CommandSource::Convention,
                "Tail logs",
            ),
        ],
    }
}

/// Recognise a sibling ecosystem product from its directory name / manifest.
pub fn ecosystem_link(dir: &Path) -> Option<crate::model::EcosystemLink> {
    use crate::model::EcosystemLink;
    let name = dir.file_name()?.to_string_lossy().to_lowercase();
    match name.as_str() {
        "blink" => Some(EcosystemLink::Blink),
        "killer" => Some(EcosystemLink::Killer),
        "flux" => Some(EcosystemLink::Flux),
        "beacon" => Some(EcosystemLink::Beacon),
        _ => None,
    }
}

fn cmd(name: &str, program: &str, args: &[&str], source: CommandSource, desc: &str) -> Command {
    Command {
        name: name.into(),
        program: program.into(),
        args: args.iter().map(|a| a.to_string()).collect(),
        description: Some(desc.into()),
        source,
    }
}

fn ensure(commands: &mut Vec<Command>, name: &str, runner: &str) {
    if !commands.iter().any(|c| c.name == name) {
        commands.push(Command {
            name: name.into(),
            program: runner.into(),
            args: vec!["run".into(), name.into()],
            description: Some(format!("npm script: {name}")),
            source: CommandSource::Convention,
        });
    }
}
