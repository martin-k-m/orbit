//! Filesystem access for the editor and file explorer.
//!
//! This is the engine behind "open a project and look at its files": a lazy
//! directory tree (one level at a time, because a real repo is far too large to
//! walk eagerly), and reading a file for display with the details an editor
//! actually needs — text vs. binary, encoding, line endings, and which language
//! to highlight it as.
//!
//! Everything here is pure filesystem work with no `unsafe` and no network. The
//! classification helpers are unit-tested; the I/O helpers are exercised through
//! temp-dir tests.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// A single entry in a directory listing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    /// File or directory name (not the full path).
    pub name: String,
    /// Absolute path.
    pub path: PathBuf,
    /// Whether this is a directory.
    pub is_dir: bool,
    /// Whether the name begins with a dot.
    pub hidden: bool,
    /// Size in bytes for files (0 for directories).
    pub size: u64,
    /// The editor language id for files, if recognised.
    #[serde(default)]
    pub language: Option<String>,
}

/// The size above which [`read_text_file`] truncates rather than loading the
/// whole file into the editor (5 MB).
pub const MAX_EDITABLE_BYTES: u64 = 5 * 1024 * 1024;

/// How lines are terminated in a file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LineEnding {
    /// `\n` — Unix.
    Lf,
    /// `\r\n` — Windows.
    Crlf,
    /// No line break present (single line or empty).
    None,
}

impl LineEnding {
    /// A short label for the status bar.
    pub fn label(self) -> &'static str {
        match self {
            LineEnding::Lf => "LF",
            LineEnding::Crlf => "CRLF",
            LineEnding::None => "—",
        }
    }
}

/// The text encoding we decoded a file as.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Encoding {
    /// UTF-8, with or without a BOM.
    Utf8,
    /// UTF-16 little-endian (BOM detected).
    Utf16Le,
    /// UTF-16 big-endian (BOM detected).
    Utf16Be,
}

impl Encoding {
    /// A short label for the status bar.
    pub fn label(self) -> &'static str {
        match self {
            Encoding::Utf8 => "UTF-8",
            Encoding::Utf16Le => "UTF-16 LE",
            Encoding::Utf16Be => "UTF-16 BE",
        }
    }
}

/// A file loaded for editing/preview.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContents {
    /// The decoded text (empty when `binary` is true).
    pub text: String,
    /// The editor language id, if recognised.
    pub language: Option<String>,
    /// Detected encoding.
    pub encoding: Encoding,
    /// Detected line ending.
    pub line_ending: LineEnding,
    /// Whether the file looked binary (no text returned).
    pub binary: bool,
    /// Whether the file was truncated because it exceeded [`MAX_EDITABLE_BYTES`].
    pub truncated: bool,
    /// The full size on disk, in bytes.
    pub size: u64,
}

/// The editor/Monaco language id for a path, by extension and a few special
/// filenames. `None` for anything we don't map (the editor falls back to plain
/// text).
pub fn language_for(path: &Path) -> Option<String> {
    // Extension-less files that are still recognisable by name.
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        let by_name = match name {
            "Dockerfile" | "Containerfile" => Some("dockerfile"),
            "Makefile" | "makefile" | "GNUmakefile" => Some("makefile"),
            "CMakeLists.txt" => Some("cmake"),
            ".gitignore" | ".dockerignore" | ".npmignore" => Some("ignore"),
            ".env" => Some("dotenv"),
            _ => None,
        };
        if let Some(lang) = by_name {
            return Some(lang.to_string());
        }
    }

    let ext = path.extension()?.to_str()?.to_lowercase();
    let lang = match ext.as_str() {
        "rs" => "rust",
        "ts" | "mts" | "cts" => "typescript",
        "tsx" => "typescript",
        "js" | "mjs" | "cjs" => "javascript",
        "jsx" => "javascript",
        "py" | "pyi" => "python",
        "go" => "go",
        "java" => "java",
        "cs" => "csharp",
        "c" | "h" => "c",
        "cc" | "cpp" | "cxx" | "hpp" | "hh" => "cpp",
        "html" | "htm" => "html",
        "css" => "css",
        "scss" => "scss",
        "less" => "less",
        "json" | "jsonc" => "json",
        "yaml" | "yml" => "yaml",
        "toml" => "toml",
        "md" | "markdown" => "markdown",
        "sql" => "sql",
        "sh" | "bash" | "zsh" | "fish" => "shell",
        "ps1" | "psm1" => "powershell",
        "rb" => "ruby",
        "php" => "php",
        "swift" => "swift",
        "kt" | "kts" => "kotlin",
        "xml" | "svg" => "xml",
        "vue" => "vue",
        "svelte" => "svelte",
        "lua" => "lua",
        "dart" => "dart",
        "graphql" | "gql" => "graphql",
        "ini" | "cfg" | "conf" => "ini",
        _ => return None,
    };
    Some(lang.to_string())
}

/// List the immediate children of `dir`, directories first then files, each
/// group sorted case-insensitively by name.
///
/// Lazy by design: an editor tree expands one directory per click, so we never
/// pay to walk a whole repository.
pub fn list_dir(dir: &Path) -> crate::Result<Vec<FileNode>> {
    let entries = std::fs::read_dir(dir).map_err(|e| crate::Error::io(dir, e))?;

    let mut nodes = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()).map(String::from) else {
            continue;
        };
        let meta = entry.metadata().ok();
        let is_dir = meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        nodes.push(FileNode {
            hidden: name.starts_with('.'),
            size: if is_dir {
                0
            } else {
                meta.as_ref().map(|m| m.len()).unwrap_or(0)
            },
            language: if is_dir { None } else { language_for(&path) },
            name,
            path,
            is_dir,
        });
    }

    nodes.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir) // directories first
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(nodes)
}

/// Read a file for the editor: decode it, and report encoding, line ending,
/// language, and whether it was binary or truncated.
pub fn read_text_file(path: &Path) -> crate::Result<FileContents> {
    let size = std::fs::metadata(path)
        .map_err(|e| crate::Error::io(path, e))?
        .len();

    let language = language_for(path);
    let truncated = size > MAX_EDITABLE_BYTES;
    let bytes = read_capped(path, MAX_EDITABLE_BYTES as usize)?;

    // A NUL byte in the first chunk is the classic "this is binary" signal.
    if bytes.contains(&0) && detect_utf16(&bytes).is_none() {
        return Ok(FileContents {
            text: String::new(),
            language,
            encoding: Encoding::Utf8,
            line_ending: LineEnding::None,
            binary: true,
            truncated,
            size,
        });
    }

    let (encoding, text) = decode(&bytes);
    let line_ending = detect_line_ending(&text);

    Ok(FileContents {
        text,
        language,
        encoding,
        line_ending,
        binary: false,
        truncated,
        size,
    })
}

fn read_capped(path: &Path, cap: usize) -> crate::Result<Vec<u8>> {
    use std::io::Read;
    let file = std::fs::File::open(path).map_err(|e| crate::Error::io(path, e))?;
    let mut buf = Vec::new();
    file.take(cap as u64)
        .read_to_end(&mut buf)
        .map_err(|e| crate::Error::io(path, e))?;
    Ok(buf)
}

/// Detect a UTF-16 BOM, returning the endianness if present.
fn detect_utf16(bytes: &[u8]) -> Option<Encoding> {
    match bytes {
        [0xFF, 0xFE, ..] => Some(Encoding::Utf16Le),
        [0xFE, 0xFF, ..] => Some(Encoding::Utf16Be),
        _ => None,
    }
}

/// Decode bytes to text, honouring a UTF-8 or UTF-16 BOM and falling back to a
/// lossy UTF-8 read.
fn decode(bytes: &[u8]) -> (Encoding, String) {
    if let Some(enc) = detect_utf16(bytes) {
        let units: Vec<u16> = match enc {
            Encoding::Utf16Le => bytes[2..]
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect(),
            Encoding::Utf16Be => bytes[2..]
                .chunks_exact(2)
                .map(|c| u16::from_be_bytes([c[0], c[1]]))
                .collect(),
            Encoding::Utf8 => unreachable!(),
        };
        return (enc, String::from_utf16_lossy(&units));
    }

    // Strip a UTF-8 BOM if present, then decode lossily.
    let body = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(bytes);
    (Encoding::Utf8, String::from_utf8_lossy(body).into_owned())
}

fn detect_line_ending(text: &str) -> LineEnding {
    match text.find('\n') {
        Some(idx) if idx > 0 && text.as_bytes()[idx - 1] == b'\r' => LineEnding::Crlf,
        Some(_) => LineEnding::Lf,
        None => LineEnding::None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    #[test]
    fn language_by_extension_and_name() {
        assert_eq!(
            language_for(Path::new("src/main.rs")).as_deref(),
            Some("rust")
        );
        assert_eq!(
            language_for(Path::new("a/b/app.tsx")).as_deref(),
            Some("typescript")
        );
        assert_eq!(language_for(Path::new("x.PY")).as_deref(), Some("python"));
        assert_eq!(
            language_for(Path::new("Cargo.toml")).as_deref(),
            Some("toml")
        );
        assert_eq!(
            language_for(Path::new("Dockerfile")).as_deref(),
            Some("dockerfile")
        );
        assert_eq!(
            language_for(Path::new("Makefile")).as_deref(),
            Some("makefile")
        );
        assert_eq!(
            language_for(Path::new(".gitignore")).as_deref(),
            Some("ignore")
        );
        assert_eq!(language_for(Path::new("notes.unknownext")), None);
        assert_eq!(language_for(Path::new("LICENSE")), None);
    }

    #[test]
    fn line_ending_detection() {
        assert_eq!(detect_line_ending("a\nb"), LineEnding::Lf);
        assert_eq!(detect_line_ending("a\r\nb"), LineEnding::Crlf);
        assert_eq!(detect_line_ending("single line"), LineEnding::None);
        assert_eq!(detect_line_ending(""), LineEnding::None);
    }

    #[test]
    fn decode_utf8_strips_bom() {
        let with_bom = [0xEF, 0xBB, 0xBF, b'h', b'i'];
        let (enc, text) = decode(&with_bom);
        assert_eq!(enc, Encoding::Utf8);
        assert_eq!(text, "hi");
    }

    #[test]
    fn decode_utf16le_bom() {
        // "hi" in UTF-16 LE with BOM.
        let bytes = [0xFF, 0xFE, b'h', 0x00, b'i', 0x00];
        let (enc, text) = decode(&bytes);
        assert_eq!(enc, Encoding::Utf16Le);
        assert_eq!(text, "hi");
    }

    #[test]
    fn list_dir_orders_dirs_first_then_name() {
        let tmp = tempfile::tempdir().unwrap();
        fs::create_dir(tmp.path().join("src")).unwrap();
        fs::create_dir(tmp.path().join(".git")).unwrap();
        fs::write(tmp.path().join("Cargo.toml"), "[package]").unwrap();
        fs::write(tmp.path().join("README.md"), "# hi").unwrap();

        let nodes = list_dir(tmp.path()).unwrap();
        let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();
        // Directories (.git, src) first — case-insensitive — then files.
        assert_eq!(names, vec![".git", "src", "Cargo.toml", "README.md"]);

        let cargo = nodes.iter().find(|n| n.name == "Cargo.toml").unwrap();
        assert!(!cargo.is_dir);
        assert_eq!(cargo.language.as_deref(), Some("toml"));
        let git = nodes.iter().find(|n| n.name == ".git").unwrap();
        assert!(git.is_dir && git.hidden);
    }

    #[test]
    fn read_text_file_reports_language_and_line_ending() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("main.rs");
        fs::write(&path, "fn main() {\r\n    println!(\"hi\");\r\n}\r\n").unwrap();

        let contents = read_text_file(&path).unwrap();
        assert!(!contents.binary);
        assert_eq!(contents.language.as_deref(), Some("rust"));
        assert_eq!(contents.line_ending, LineEnding::Crlf);
        assert_eq!(contents.encoding, Encoding::Utf8);
        assert!(contents.text.contains("println!"));
        assert!(!contents.truncated);
    }

    #[test]
    fn read_text_file_flags_binary() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("blob.bin");
        fs::write(&path, [0u8, 1, 2, 3, 255, 0, 42]).unwrap();

        let contents = read_text_file(&path).unwrap();
        assert!(contents.binary);
        assert!(contents.text.is_empty());
    }
}
