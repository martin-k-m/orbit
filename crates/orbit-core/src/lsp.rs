//! Language Server Protocol wire foundation.
//!
//! This is the honest first step toward LSP integration the phase asks to
//! "prepare for": the base-protocol framing (`Content-Length` headers over
//! stdio) and small JSON-RPC 2.0 helpers. It is deliberately **transport-only**
//! — no server is spawned and no editor feature is wired yet — but it's the real
//! plumbing every LSP client needs, and it's fully unit-tested. The next step is
//! a client that spawns a server (rust-analyzer, typescript-language-server, …),
//! performs the `initialize` handshake, and streams diagnostics.
//!
//! Pure string/byte work; no `unsafe`, no I/O here.

use serde_json::{json, Value};

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
}
