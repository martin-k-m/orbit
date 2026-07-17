//! Language Server Protocol client core.
//!
//! Two transport-free layers toward LSP integration, both fully unit-tested:
//!
//! 1. The **base protocol** — `Content-Length` framing ([`frame`]), JSON-RPC
//!    helpers ([`request`]/[`notification`]), and an incremental [`Decoder`]
//!    that reassembles messages arriving in arbitrary chunks.
//! 2. The **client state machine** ([`Session`]) — the `initialize` handshake,
//!    request-id correlation, `textDocument/didOpen`/`definition`, replying to
//!    server-to-client requests, and storing `publishDiagnostics`.
//!
//! Keeping both transport-free is deliberate: it makes the whole conversation
//! testable by scripting messages, with no real server. The remaining step is a
//! thin **driver** that spawns a server (rust-analyzer, typescript-language-
//! server, …), pumps its stdio through [`Session`], and surfaces diagnostics /
//! go-to-definition in the UI — that part needs a live server and the Tauri
//! backend, so it proves out in CI's bundle build, not here.
//!
//! Pure string/byte/JSON work; no `unsafe`, no process I/O in this module.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

/// A 0-based position in a document (LSP uses 0-based line/character).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Position {
    pub line: u32,
    pub character: u32,
}

/// A half-open range within a document.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Range {
    pub start: Position,
    pub end: Position,
}

/// A diagnostic (error/warning/…) published by a server for a document.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub range: Range,
    /// LSP severity: 1 error, 2 warning, 3 information, 4 hint.
    pub severity: u8,
    pub message: String,
    pub source: Option<String>,
}

/// A resolved location (e.g. a go-to-definition target).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    pub uri: String,
    pub range: Range,
}

/// Frame a JSON-RPC payload with the LSP base-protocol header. `Content-Length`
/// is the payload's **byte** length, per the spec.
pub fn frame(payload: &str) -> Vec<u8> {
    format!("Content-Length: {}\r\n\r\n{payload}", payload.len()).into_bytes()
}

/// Build a JSON-RPC request (has an `id`, expects a response).
pub fn request(id: i64, method: &str, params: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params })
}

/// Build a JSON-RPC notification (no `id`, no response).
pub fn notification(method: &str, params: Value) -> Value {
    json!({ "jsonrpc": "2.0", "method": method, "params": params })
}

/// Incrementally decodes `Content-Length`-framed messages from a byte stream.
///
/// A server's stdout arrives in arbitrary chunks — a header split across two
/// reads, several messages in one read — so callers `feed` whatever they get and
/// drain complete payloads with [`Decoder::next_message`].
#[derive(Debug, Default)]
pub struct Decoder {
    buf: Vec<u8>,
}

impl Decoder {
    pub fn new() -> Self {
        Self::default()
    }

    /// Append received bytes to the internal buffer.
    pub fn feed(&mut self, bytes: &[u8]) {
        self.buf.extend_from_slice(bytes);
    }

    /// Pop the next complete message payload, or `None` if one isn't fully
    /// buffered yet.
    pub fn next_message(&mut self) -> Option<String> {
        let header_end = find(&self.buf, b"\r\n\r\n")?;
        let len = content_length(&self.buf[..header_end])?;
        let body_start = header_end + 4;
        if self.buf.len() < body_start + len {
            return None; // header seen, body still arriving
        }
        let body = self.buf[body_start..body_start + len].to_vec();
        self.buf.drain(..body_start + len);
        Some(String::from_utf8_lossy(&body).into_owned())
    }
}

/// Index of the first occurrence of `needle` in `haystack`.
fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || haystack.len() < needle.len() {
        return None;
    }
    (0..=haystack.len() - needle.len()).find(|&i| &haystack[i..i + needle.len()] == needle)
}

/// Parse the `Content-Length` value out of a header block (case-insensitive).
fn content_length(header: &[u8]) -> Option<usize> {
    let text = String::from_utf8_lossy(header);
    for line in text.split("\r\n") {
        if let Some((name, value)) = line.split_once(':') {
            if name.trim().eq_ignore_ascii_case("content-length") {
                return value.trim().parse().ok();
            }
        }
    }
    None
}

/// The protocol state machine of an LSP client, independent of transport.
///
/// A driver spawns the server, writes the bytes each method returns, feeds
/// server output through a [`Decoder`], and hands each payload to [`handle`].
/// Keeping the state machine transport-free is what makes it unit-testable: the
/// tests script a full conversation without a real server.
///
/// [`handle`]: Session::handle
#[derive(Debug)]
pub struct Session {
    next_id: i64,
    root_uri: String,
    initialized: bool,
    /// id → method, so a response can be interpreted.
    pending: HashMap<i64, String>,
    /// id → result value, for responses the caller will collect.
    responses: HashMap<i64, Value>,
    /// uri → latest diagnostics.
    diagnostics: HashMap<String, Vec<Diagnostic>>,
}

impl Session {
    /// Start a session for a workspace root (a `file://` URI).
    pub fn new(root_uri: &str) -> Self {
        Session {
            next_id: 0,
            root_uri: root_uri.to_string(),
            initialized: false,
            pending: HashMap::new(),
            responses: HashMap::new(),
            diagnostics: HashMap::new(),
        }
    }

    fn alloc(&mut self) -> i64 {
        self.next_id += 1;
        self.next_id
    }

    /// Whether the `initialize` handshake has completed.
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// The framed `initialize` request to send first.
    pub fn initialize(&mut self) -> Vec<u8> {
        let id = self.alloc();
        self.pending.insert(id, "initialize".into());
        let params = json!({
            "processId": null,
            "rootUri": self.root_uri,
            "clientInfo": { "name": "Orbit" },
            "capabilities": {
                "textDocument": {
                    "synchronization": { "didSave": true },
                    "publishDiagnostics": {},
                    "definition": { "linkSupport": true },
                    "hover": {}
                },
                "workspace": {}
            }
        });
        frame(&request(id, "initialize", params).to_string())
    }

    /// A `textDocument/didOpen` notification.
    pub fn did_open(&self, uri: &str, language_id: &str, version: i64, text: &str) -> Vec<u8> {
        let params = json!({
            "textDocument": {
                "uri": uri,
                "languageId": language_id,
                "version": version,
                "text": text
            }
        });
        frame(&notification("textDocument/didOpen", params).to_string())
    }

    /// A `textDocument/definition` request. Returns `(id, bytes)`; match the id
    /// against [`take_location`](Session::take_location) once the response lands.
    pub fn definition(&mut self, uri: &str, line: u32, character: u32) -> (i64, Vec<u8>) {
        let id = self.alloc();
        self.pending.insert(id, "textDocument/definition".into());
        let params = json!({
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character }
        });
        (
            id,
            frame(&request(id, "textDocument/definition", params).to_string()),
        )
    }

    /// Process one server payload, returning any framed messages to send back
    /// (e.g. the `initialized` notification, or a reply to a server request).
    pub fn handle(&mut self, payload: &str) -> Vec<Vec<u8>> {
        let Ok(msg) = serde_json::from_str::<Value>(payload) else {
            return Vec::new();
        };
        let id = msg.get("id").and_then(Value::as_i64);
        let method = msg.get("method").and_then(Value::as_str);

        match (id, method) {
            // Server-to-client request: reply so the server doesn't stall.
            (Some(id), Some(m)) => vec![self.reply(id, m, &msg)],
            // Response to one of our requests.
            (Some(id), None) => {
                if let Some(req_method) = self.pending.remove(&id) {
                    if req_method == "initialize" {
                        self.initialized = true;
                        return vec![frame(&notification("initialized", json!({})).to_string())];
                    }
                    self.responses
                        .insert(id, msg.get("result").cloned().unwrap_or(Value::Null));
                }
                Vec::new()
            }
            // Notification from the server.
            (None, Some("textDocument/publishDiagnostics")) => {
                if let Some(params) = msg.get("params") {
                    let uri = params
                        .get("uri")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string();
                    let diags = params
                        .get("diagnostics")
                        .map(parse_diagnostics)
                        .unwrap_or_default();
                    self.diagnostics.insert(uri, diags);
                }
                Vec::new()
            }
            _ => Vec::new(),
        }
    }

    /// Build a reply to a server-to-client request. Unknown requests get `null`,
    /// which every server tolerates; `workspace/configuration` needs one entry
    /// per requested item.
    fn reply(&self, id: i64, method: &str, msg: &Value) -> Vec<u8> {
        let result = if method == "workspace/configuration" {
            let n = msg
                .get("params")
                .and_then(|p| p.get("items"))
                .and_then(Value::as_array)
                .map(|a| a.len())
                .unwrap_or(0);
            Value::Array(vec![Value::Null; n])
        } else {
            Value::Null
        };
        frame(&json!({ "jsonrpc": "2.0", "id": id, "result": result }).to_string())
    }

    /// The latest diagnostics for a document uri.
    pub fn diagnostics(&self, uri: &str) -> &[Diagnostic] {
        self.diagnostics.get(uri).map_or(&[], Vec::as_slice)
    }

    /// Take a definition response by request id and resolve it to a location.
    pub fn take_location(&mut self, id: i64) -> Option<Location> {
        let result = self.responses.remove(&id)?;
        parse_location(&result)
    }
}

fn parse_position(v: &Value) -> Position {
    Position {
        line: v.get("line").and_then(Value::as_u64).unwrap_or(0) as u32,
        character: v.get("character").and_then(Value::as_u64).unwrap_or(0) as u32,
    }
}

fn parse_range(v: &Value) -> Range {
    Range {
        start: parse_position(v.get("start").unwrap_or(&Value::Null)),
        end: parse_position(v.get("end").unwrap_or(&Value::Null)),
    }
}

fn parse_diagnostics(v: &Value) -> Vec<Diagnostic> {
    v.as_array()
        .map(|arr| {
            arr.iter()
                .map(|d| Diagnostic {
                    range: parse_range(d.get("range").unwrap_or(&Value::Null)),
                    severity: d.get("severity").and_then(Value::as_u64).unwrap_or(1) as u8,
                    message: d
                        .get("message")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string(),
                    source: d.get("source").and_then(Value::as_str).map(str::to_string),
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Resolve a `textDocument/definition` result — a `Location`, a `Location[]`,
/// or a `LocationLink[]` — to a single [`Location`].
fn parse_location(result: &Value) -> Option<Location> {
    let one = match result {
        Value::Array(a) => a.first()?,
        Value::Null => return None,
        obj => obj,
    };
    // LocationLink uses targetUri/targetRange; Location uses uri/range.
    if let Some(uri) = one.get("targetUri").and_then(Value::as_str) {
        return Some(Location {
            uri: uri.to_string(),
            range: parse_range(one.get("targetRange").unwrap_or(&Value::Null)),
        });
    }
    let uri = one.get("uri").and_then(Value::as_str)?;
    Some(Location {
        uri: uri.to_string(),
        range: parse_range(one.get("range").unwrap_or(&Value::Null)),
    })
}

/// The recommended language server for an editor language id, if one is common
/// enough to try. `(program, args)` — the driver checks it's actually installed.
pub fn server_for(language: &str) -> Option<(&'static str, &'static [&'static str])> {
    match language {
        "rust" => Some(("rust-analyzer", &[])),
        "typescript" | "javascript" => Some(("typescript-language-server", &["--stdio"])),
        "python" => Some(("pylsp", &[])),
        "go" => Some(("gopls", &[])),
        _ => None,
    }
}

/// A running language server: spawns the process, pumps its stdout through a
/// [`Session`] on a background thread (writing any replies back), and lets the
/// caller open documents and read diagnostics.
///
/// This is the transport the [`Session`] state machine was built to be driven
/// by. It's plain `std::process`/threads (no Tauri), so it compiles and is
/// checkable in `orbit-core`; actually exercising it needs a real server
/// installed, so the integration test is `#[ignore]`d by default.
#[derive(Debug)]
pub struct LspDriver {
    child: Child,
    stdin: Arc<Mutex<std::process::ChildStdin>>,
    session: Arc<Mutex<Session>>,
    version: i64,
    _reader: JoinHandle<()>,
}

impl LspDriver {
    /// Spawn `program args…` as a server for `root_uri` and send `initialize`.
    pub fn start(program: &str, args: &[&str], root_uri: &str) -> std::io::Result<Self> {
        let mut child = Command::new(program)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()?;

        let stdin = Arc::new(Mutex::new(child.stdin.take().expect("piped stdin")));
        let mut stdout = child.stdout.take().expect("piped stdout");
        let session = Arc::new(Mutex::new(Session::new(root_uri)));

        // Kick off the handshake.
        {
            let init = session.lock().unwrap().initialize();
            stdin.lock().unwrap().write_all(&init)?;
        }

        // Reader thread: server stdout → Session → write any replies back.
        let reader_session = Arc::clone(&session);
        let reader_stdin = Arc::clone(&stdin);
        let _reader = std::thread::spawn(move || {
            let mut decoder = Decoder::new();
            let mut chunk = [0u8; 8192];
            loop {
                match stdout.read(&mut chunk) {
                    Ok(0) | Err(_) => break, // server closed or errored
                    Ok(n) => decoder.feed(&chunk[..n]),
                }
                while let Some(payload) = decoder.next_message() {
                    let replies = reader_session.lock().unwrap().handle(&payload);
                    if let Ok(mut w) = reader_stdin.lock() {
                        for r in replies {
                            let _ = w.write_all(&r);
                        }
                    }
                }
            }
        });

        Ok(LspDriver {
            child,
            stdin,
            session,
            version: 0,
            _reader,
        })
    }

    /// Whether the `initialize` handshake has completed (poll after `start`).
    pub fn is_ready(&self) -> bool {
        self.session.lock().unwrap().is_initialized()
    }

    /// Notify the server a document is open (or its full text changed).
    pub fn open(&mut self, uri: &str, language_id: &str, text: &str) -> std::io::Result<()> {
        self.version += 1;
        let msg = self
            .session
            .lock()
            .unwrap()
            .did_open(uri, language_id, self.version, text);
        self.stdin.lock().unwrap().write_all(&msg)
    }

    /// The diagnostics currently known for a document.
    pub fn diagnostics(&self, uri: &str) -> Vec<Diagnostic> {
        self.session.lock().unwrap().diagnostics(uri).to_vec()
    }
}

impl Drop for LspDriver {
    fn drop(&mut self) {
        // Best-effort: ask the child to stop, then reap it.
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frames_with_byte_length_header() {
        assert_eq!(frame("{}"), b"Content-Length: 2\r\n\r\n{}".to_vec());
        // Byte length, not char length: "é" is two bytes.
        assert_eq!(frame("é"), b"Content-Length: 2\r\n\r\n\xc3\xa9".to_vec());
    }

    #[test]
    fn requests_and_notifications_shape() {
        let r = request(1, "initialize", json!({"x": 1}));
        assert_eq!(r["jsonrpc"], "2.0");
        assert_eq!(r["id"], 1);
        assert_eq!(r["method"], "initialize");
        let n = notification("initialized", json!({}));
        assert!(n.get("id").is_none());
        assert_eq!(n["method"], "initialized");
    }

    #[test]
    fn decodes_a_single_message() {
        let mut d = Decoder::new();
        d.feed(&frame("{\"hello\":true}"));
        assert_eq!(d.next_message().as_deref(), Some("{\"hello\":true}"));
        assert!(d.next_message().is_none());
    }

    #[test]
    fn decodes_multiple_messages_in_one_feed() {
        let mut d = Decoder::new();
        let mut bytes = frame("\"a\"");
        bytes.extend(frame("\"b\""));
        d.feed(&bytes);
        assert_eq!(d.next_message().as_deref(), Some("\"a\""));
        assert_eq!(d.next_message().as_deref(), Some("\"b\""));
        assert!(d.next_message().is_none());
    }

    #[test]
    fn reassembles_a_split_frame() {
        let mut d = Decoder::new();
        let full = frame("\"payload\"");
        let split = 8; // mid-header
        d.feed(&full[..split]);
        assert!(d.next_message().is_none(), "header incomplete");
        d.feed(&full[split..]);
        assert_eq!(d.next_message().as_deref(), Some("\"payload\""));
    }

    #[test]
    fn tolerates_extra_headers_and_case() {
        let payload = "{}";
        let raw = format!(
            "content-length: {}\r\nContent-Type: application/vscode-jsonrpc\r\n\r\n{payload}",
            payload.len()
        );
        let mut d = Decoder::new();
        d.feed(raw.as_bytes());
        assert_eq!(d.next_message().as_deref(), Some("{}"));
    }

    // --- Session state machine ---

    /// Decode the single framed message in `bytes` back to a JSON value.
    fn decode_one(bytes: &[u8]) -> Value {
        let mut d = Decoder::new();
        d.feed(bytes);
        serde_json::from_str(&d.next_message().expect("a framed message")).unwrap()
    }

    #[test]
    fn initialize_handshake_emits_initialized() {
        let mut s = Session::new("file:///proj");
        let init = decode_one(&s.initialize());
        assert_eq!(init["method"], "initialize");
        assert_eq!(init["id"], 1);
        assert_eq!(init["params"]["rootUri"], "file:///proj");
        assert!(!s.is_initialized());

        // Server replies to the initialize request.
        let reply = r#"{"jsonrpc":"2.0","id":1,"result":{"capabilities":{}}}"#;
        let out = s.handle(reply);
        assert!(s.is_initialized());
        assert_eq!(out.len(), 1);
        assert_eq!(decode_one(&out[0])["method"], "initialized");
    }

    #[test]
    fn publish_diagnostics_are_stored() {
        let mut s = Session::new("file:///proj");
        let note = r#"{"jsonrpc":"2.0","method":"textDocument/publishDiagnostics","params":{
            "uri":"file:///proj/src/main.rs",
            "diagnostics":[
              {"range":{"start":{"line":3,"character":4},"end":{"line":3,"character":9}},
               "severity":1,"message":"cannot find value","source":"rustc"}
            ]}}"#;
        assert!(s.handle(note).is_empty());
        let diags = s.diagnostics("file:///proj/src/main.rs");
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].severity, 1);
        assert_eq!(diags[0].message, "cannot find value");
        assert_eq!(diags[0].source.as_deref(), Some("rustc"));
        assert_eq!(diags[0].range.start.line, 3);
        assert_eq!(diags[0].range.start.character, 4);
        // Unknown uri → empty.
        assert!(s.diagnostics("file:///nope").is_empty());
    }

    #[test]
    fn definition_response_resolves_a_location() {
        let mut s = Session::new("file:///proj");
        let (id, bytes) = s.definition("file:///proj/a.rs", 10, 2);
        let req = decode_one(&bytes);
        assert_eq!(req["method"], "textDocument/definition");
        assert_eq!(req["id"], id);

        // Server returns a Location array.
        let resp = format!(
            r#"{{"jsonrpc":"2.0","id":{id},"result":[{{"uri":"file:///proj/b.rs","range":{{"start":{{"line":7,"character":0}},"end":{{"line":7,"character":5}}}}}}]}}"#
        );
        assert!(s.handle(&resp).is_empty());
        let loc = s.take_location(id).expect("a location");
        assert_eq!(loc.uri, "file:///proj/b.rs");
        assert_eq!(loc.range.start.line, 7);
        // A second take is empty (consumed).
        assert!(s.take_location(id).is_none());
    }

    #[test]
    fn location_link_shape_is_handled() {
        let result = json!([{
            "targetUri": "file:///x.rs",
            "targetRange": {"start":{"line":1,"character":0},"end":{"line":1,"character":3}}
        }]);
        let loc = parse_location(&result).unwrap();
        assert_eq!(loc.uri, "file:///x.rs");
        assert_eq!(loc.range.start.line, 1);
    }

    #[test]
    fn server_configuration_request_gets_a_sized_reply() {
        let mut s = Session::new("file:///proj");
        let req = r#"{"jsonrpc":"2.0","id":7,"method":"workspace/configuration","params":{"items":[{},{}]}}"#;
        let out = s.handle(req);
        assert_eq!(out.len(), 1);
        let reply = decode_one(&out[0]);
        assert_eq!(reply["id"], 7);
        // One (null) result per requested item.
        assert_eq!(reply["result"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn known_languages_map_to_servers() {
        assert_eq!(server_for("rust").unwrap().0, "rust-analyzer");
        assert_eq!(
            server_for("typescript").unwrap().0,
            "typescript-language-server"
        );
        assert!(server_for("cobol").is_none());
    }

    // Real end-to-end driver test — needs `rust-analyzer` on PATH, so it's
    // ignored by default. Run with `cargo test -- --ignored` where available.
    #[test]
    #[ignore]
    fn driver_handshakes_with_rust_analyzer() {
        let tmp = tempfile::tempdir().unwrap();
        let root = format!("file://{}", tmp.path().display());
        let Ok(mut driver) = LspDriver::start("rust-analyzer", &[], &root) else {
            return; // server not installed; nothing to assert
        };
        // Give the handshake a moment.
        for _ in 0..50 {
            if driver.is_ready() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        assert!(
            driver.is_ready(),
            "rust-analyzer should complete initialize"
        );
        driver
            .open("file:///x.rs", "rust", "fn main() { let x = ; }")
            .unwrap();
    }
}
