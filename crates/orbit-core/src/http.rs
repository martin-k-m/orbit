//! A minimal HTTP client for the API explorer.
//!
//! Like [`crate::git`] and [`crate::docker`], this shells out to a CLI the
//! developer already has — here `curl` — instead of pulling a TLS stack into the
//! engine. `curl` ships on macOS, Linux and Windows 10+. A missing `curl` or a
//! network error surfaces as an [`crate::Error::Command`]. The response parser is
//! pure and unit-tested; the actual request is exercised by hand.

use crate::error::Error;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Instant;

/// One response header.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Header {
    pub name: String,
    pub value: String,
}

/// A parsed HTTP response.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<Header>,
    pub body: String,
    pub elapsed_ms: u64,
}

/// Send a request via `curl` and return the parsed response.
///
/// `headers` are `(name, value)` pairs. `body` is sent as-is when present.
/// Redirects are not followed, so the response is a single header block.
pub fn request(
    method: &str,
    url: &str,
    headers: &[(String, String)],
    body: Option<&str>,
) -> crate::Result<HttpResponse> {
    let mut args: Vec<String> = vec![
        "-sS".into(),        // quiet, but still print errors
        "-i".into(),         // include response headers in the output
        "--max-time".into(), // never hang the UI forever
        "30".into(),
        "-X".into(),
        method.to_uppercase(),
    ];
    for (name, value) in headers {
        if name.trim().is_empty() {
            continue;
        }
        args.push("-H".into());
        args.push(format!("{name}: {value}"));
    }
    if let Some(b) = body {
        if !b.is_empty() {
            args.push("--data-binary".into());
            args.push(b.to_string());
        }
    }
    args.push(url.to_string());

    let started = Instant::now();
    let output = Command::new("curl")
        .args(&args)
        .output()
        .map_err(|e| Error::Command {
            command: "curl".into(),
            message: format!("could not run curl: {e}"),
        })?;
    let elapsed_ms = started.elapsed().as_millis() as u64;

    if !output.status.success() {
        return Err(Error::Command {
            command: format!("curl {method} {url}"),
            message: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        });
    }

    Ok(parse_response(
        &String::from_utf8_lossy(&output.stdout),
        elapsed_ms,
    ))
}

/// Split a `curl -i` payload into status, headers and body.
fn parse_response(raw: &str, elapsed_ms: u64) -> HttpResponse {
    // Without a status line there are no headers to peel off — it's all body.
    if !raw.starts_with("HTTP/") {
        return HttpResponse {
            status: 0,
            status_text: String::new(),
            headers: Vec::new(),
            body: raw.to_string(),
            elapsed_ms,
        };
    }

    // Header/body boundary is the first blank line (CRLF or LF).
    let (head, body) = match raw.find("\r\n\r\n") {
        Some(i) => (&raw[..i], &raw[i + 4..]),
        None => match raw.find("\n\n") {
            Some(i) => (&raw[..i], &raw[i + 2..]),
            None => (raw, ""),
        },
    };

    let mut lines = head.lines();
    let status_line = lines.next().unwrap_or_default();
    let (status, status_text) = parse_status_line(status_line);

    let headers = lines
        .filter_map(|l| {
            let (name, value) = l.split_once(':')?;
            Some(Header {
                name: name.trim().to_string(),
                value: value.trim().to_string(),
            })
        })
        .collect();

    HttpResponse {
        status,
        status_text,
        headers,
        body: body.to_string(),
        elapsed_ms,
    }
}

/// Parse `HTTP/1.1 200 OK` into `(200, "OK")`.
fn parse_status_line(line: &str) -> (u16, String) {
    let mut parts = line.split_whitespace();
    let _version = parts.next();
    let status = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
    let text = parts.collect::<Vec<_>>().join(" ");
    (status, text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_status_headers_and_body() {
        let raw = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nX-Trace: abc\r\n\r\n{\"ok\":true}";
        let r = parse_response(raw, 42);
        assert_eq!(r.status, 200);
        assert_eq!(r.status_text, "OK");
        assert_eq!(r.headers.len(), 2);
        assert_eq!(r.headers[0].name, "Content-Type");
        assert_eq!(r.headers[0].value, "application/json");
        assert_eq!(r.body, "{\"ok\":true}");
        assert_eq!(r.elapsed_ms, 42);
    }

    #[test]
    fn tolerates_lf_only_and_missing_body() {
        let raw = "HTTP/2 404 Not Found\nContent-Length: 0\n\n";
        let r = parse_response(raw, 1);
        assert_eq!(r.status, 404);
        assert_eq!(r.status_text, "Not Found");
        assert_eq!(r.headers.len(), 1);
        assert_eq!(r.body, "");
    }

    #[test]
    fn handles_a_bare_body_without_headers() {
        let r = parse_response("just text", 0);
        assert_eq!(r.status, 0);
        assert_eq!(r.body, "just text");
        assert!(r.headers.is_empty());
    }
}
