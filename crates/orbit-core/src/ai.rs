//! A local-first AI chat client.
//!
//! Like [`crate::http`], this shells out to `curl` rather than pulling a TLS
//! stack into the engine, and talks the **OpenAI-compatible** chat-completions
//! protocol — the lingua franca that local runtimes (Ollama, LM Studio,
//! llama.cpp servers) and the hosted providers all speak. That means one code
//! path serves a model running on `localhost` and a cloud endpoint alike; the
//! only difference is the `base_url` and an optional API key the user supplies.
//!
//! Nothing here reaches the network on its own: a chat only happens when the UI
//! calls [`chat`] with a provider the user configured. The request builder and
//! the response parser are pure and unit-tested; the actual `curl` call is
//! exercised by hand against a real server.

use crate::error::Error;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::process::Command;

/// Who authored a message in the conversation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    /// Instructions that steer the assistant (project context, persona…).
    System,
    /// The developer.
    User,
    /// The model.
    Assistant,
}

/// One turn in a chat conversation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
}

/// A configured model endpoint. `base_url` is the OpenAI-compatible root, e.g.
/// `http://localhost:11434/v1` for Ollama or `https://api.openai.com/v1`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub base_url: String,
    pub model: String,
    /// Bearer token, if the endpoint needs one. Local servers usually don't.
    #[serde(default)]
    pub api_key: Option<String>,
}

/// The chat-completions URL for a provider's base, tolerating a trailing slash.
pub fn chat_url(base_url: &str) -> String {
    let base = base_url.trim().trim_end_matches('/');
    format!("{base}/chat/completions")
}

/// Build the JSON request body for a non-streaming chat completion.
pub fn build_body(model: &str, messages: &[ChatMessage]) -> String {
    let body = json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });
    serde_json::to_string(&body).unwrap_or_default()
}

/// Pull the assistant's reply out of an OpenAI-compatible response, turning an
/// error payload (`{"error":{"message":…}}`) into a readable [`Error`].
pub fn parse_reply(raw: &str) -> crate::Result<String> {
    let value: serde_json::Value =
        serde_json::from_str(raw.trim()).map_err(|e| Error::Command {
            command: "ai".into(),
            message: format!("the model server sent a response that wasn't JSON: {e}"),
        })?;

    // A structured error comes back as `{ "error": { "message": … } }` (or, on
    // some servers, a bare `{ "error": "…" }`).
    if let Some(err) = value.get("error") {
        let message = err
            .get("message")
            .and_then(|m| m.as_str())
            .or_else(|| err.as_str())
            .unwrap_or("the model server reported an error");
        return Err(Error::Command {
            command: "ai".into(),
            message: message.to_string(),
        });
    }

    value
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| Error::Command {
            command: "ai".into(),
            message: "the model server returned no message content".into(),
        })
}

/// Send a conversation to the provider and return the assistant's reply.
///
/// Non-streaming: the whole reply arrives at once. A missing `curl`, a network
/// failure or an error payload surfaces as an [`Error::Command`].
pub fn chat(provider: &Provider, messages: &[ChatMessage]) -> crate::Result<String> {
    let url = chat_url(&provider.base_url);
    let body = build_body(&provider.model, messages);

    let mut args: Vec<String> = vec![
        "-sS".into(),        // quiet, but still print errors
        "--max-time".into(), // never hang the UI forever
        "120".into(),
        "-X".into(),
        "POST".into(),
        "-H".into(),
        "Content-Type: application/json".into(),
    ];
    if let Some(key) = provider.api_key.as_deref() {
        if !key.trim().is_empty() {
            args.push("-H".into());
            args.push(format!("Authorization: Bearer {}", key.trim()));
        }
    }
    args.push("--data-binary".into());
    args.push(body);
    args.push(url.clone());

    let output = Command::new("curl")
        .args(&args)
        .output()
        .map_err(|e| Error::Command {
            command: "curl".into(),
            message: format!("could not run curl: {e}"),
        })?;

    if !output.status.success() {
        return Err(Error::Command {
            command: format!("curl POST {url}"),
            message: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        });
    }

    parse_reply(&String::from_utf8_lossy(&output.stdout))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chat_url_appends_the_completions_path() {
        assert_eq!(
            chat_url("http://localhost:11434/v1"),
            "http://localhost:11434/v1/chat/completions"
        );
    }

    #[test]
    fn chat_url_tolerates_a_trailing_slash_and_whitespace() {
        assert_eq!(
            chat_url("  https://api.openai.com/v1/  "),
            "https://api.openai.com/v1/chat/completions"
        );
    }

    #[test]
    fn build_body_serializes_roles_lowercase_and_disables_streaming() {
        let msgs = vec![
            ChatMessage {
                role: Role::System,
                content: "be terse".into(),
            },
            ChatMessage {
                role: Role::User,
                content: "hi".into(),
            },
        ];
        let body: serde_json::Value = serde_json::from_str(&build_body("llama3.2", &msgs)).unwrap();
        assert_eq!(body["model"], "llama3.2");
        assert_eq!(body["stream"], false);
        assert_eq!(body["messages"][0]["role"], "system");
        assert_eq!(body["messages"][1]["role"], "user");
        assert_eq!(body["messages"][1]["content"], "hi");
    }

    #[test]
    fn parse_reply_extracts_assistant_content() {
        let raw = r#"{"choices":[{"message":{"role":"assistant","content":"hello there"}}]}"#;
        assert_eq!(parse_reply(raw).unwrap(), "hello there");
    }

    #[test]
    fn parse_reply_surfaces_a_structured_error() {
        let raw = r#"{"error":{"message":"model not found","type":"invalid_request"}}"#;
        let err = parse_reply(raw).unwrap_err().to_string();
        assert!(err.contains("model not found"), "got: {err}");
    }

    #[test]
    fn parse_reply_surfaces_a_bare_string_error() {
        let raw = r#"{"error":"unauthorized"}"#;
        let err = parse_reply(raw).unwrap_err().to_string();
        assert!(err.contains("unauthorized"), "got: {err}");
    }

    #[test]
    fn parse_reply_rejects_non_json() {
        assert!(parse_reply("<html>502 Bad Gateway</html>").is_err());
    }

    #[test]
    fn parse_reply_rejects_a_response_without_content() {
        assert!(parse_reply(r#"{"choices":[]}"#).is_err());
    }
}
