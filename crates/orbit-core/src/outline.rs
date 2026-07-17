//! A lightweight document outline (symbols) for the editor's Outline panel.
//!
//! This is deliberately **syntactic**, not semantic: without a language server
//! Orbit can't build a real symbol table, so it extracts declarations with
//! per-language line heuristics — good enough to jump around a file, honest
//! about being approximate. Pure string work, unit-tested.

use serde::{Deserialize, Serialize};

/// One symbol in a file's outline.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Symbol {
    pub name: String,
    /// A coarse kind: `function`, `class`, `struct`, `heading`, …
    pub kind: String,
    /// 1-based line number.
    pub line: usize,
}

/// Extract an outline from `text` for the given editor language id.
pub fn symbols(text: &str, language: Option<&str>) -> Vec<Symbol> {
    match language.unwrap_or("") {
        "markdown" => markdown(text),
        "rust" => rust(text),
        "typescript" | "javascript" => js_ts(text),
        "python" => python(text),
        "go" => go(text),
        _ => Vec::new(),
    }
}

/// The leading `[A-Za-z0-9_]` run of `s`.
fn ident(s: &str) -> Option<String> {
    let name: String = s
        .chars()
        .take_while(|c| c.is_alphanumeric() || *c == '_')
        .collect();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}

/// Strip leading modifiers (in any order/count) so the keyword is at the front.
fn strip_modifiers(line: &str) -> &str {
    let mut s = line.trim_start();
    loop {
        let mut stripped = false;
        for m in [
            "export default ",
            "export ",
            "declare ",
            "public ",
            "private ",
            "protected ",
            "static ",
            "async ",
            "pub(crate) ",
            "pub ",
            "default ",
            "abstract ",
        ] {
            if let Some(rest) = s.strip_prefix(m) {
                s = rest.trim_start();
                stripped = true;
                break;
            }
        }
        if !stripped {
            return s;
        }
    }
}

/// If `line` (after modifiers) begins with `keyword ` return the following ident.
fn after_keyword(line: &str, keyword: &str) -> Option<String> {
    let s = strip_modifiers(line);
    let rest = s.strip_prefix(keyword)?.trim_start();
    ident(rest)
}

fn scan(text: &str, mut f: impl FnMut(&str) -> Option<Symbol>, offset: usize) -> Vec<Symbol> {
    text.lines()
        .enumerate()
        .filter_map(|(i, line)| {
            f(line).map(|mut sym| {
                sym.line = i + offset;
                sym
            })
        })
        .collect()
}

fn sym(name: String, kind: &str) -> Symbol {
    Symbol {
        name,
        kind: kind.to_string(),
        line: 0,
    }
}

fn markdown(text: &str) -> Vec<Symbol> {
    scan(
        text,
        |line| {
            let t = line.trim_start();
            if t.starts_with('#') {
                let name = t.trim_start_matches('#').trim();
                if !name.is_empty() {
                    return Some(sym(name.to_string(), "heading"));
                }
            }
            None
        },
        1,
    )
}

fn rust(text: &str) -> Vec<Symbol> {
    scan(
        text,
        |line| {
            for (kw, kind) in [
                ("fn ", "function"),
                ("struct ", "struct"),
                ("enum ", "enum"),
                ("trait ", "trait"),
                ("mod ", "module"),
                ("const ", "constant"),
                ("static ", "constant"),
                ("type ", "type"),
            ] {
                if let Some(name) = after_keyword(line, kw) {
                    return Some(sym(name, kind));
                }
            }
            None
        },
        1,
    )
}

fn js_ts(text: &str) -> Vec<Symbol> {
    scan(
        text,
        |line| {
            for (kw, kind) in [
                ("function ", "function"),
                ("class ", "class"),
                ("interface ", "interface"),
                ("enum ", "enum"),
                ("type ", "type"),
            ] {
                if let Some(name) = after_keyword(line, kw) {
                    return Some(sym(name, kind));
                }
            }
            None
        },
        1,
    )
}

fn python(text: &str) -> Vec<Symbol> {
    scan(
        text,
        |line| {
            if let Some(name) = after_keyword(line, "def ") {
                return Some(sym(name, "function"));
            }
            if let Some(name) = after_keyword(line, "class ") {
                return Some(sym(name, "class"));
            }
            None
        },
        1,
    )
}

fn go(text: &str) -> Vec<Symbol> {
    scan(
        text,
        |line| {
            if let Some(name) = after_keyword(line, "func ") {
                return Some(sym(name, "function"));
            }
            if let Some(name) = after_keyword(line, "type ") {
                return Some(sym(name, "type"));
            }
            None
        },
        1,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rust_symbols_with_modifiers_and_lines() {
        let src = "use std::fmt;\n\npub struct Widget {\n    x: i32,\n}\n\npub async fn run() {}\nfn helper() {}\n";
        let syms = symbols(src, Some("rust"));
        let got: Vec<(&str, &str, usize)> = syms
            .iter()
            .map(|s| (s.name.as_str(), s.kind.as_str(), s.line))
            .collect();
        assert_eq!(
            got,
            vec![
                ("Widget", "struct", 3),
                ("run", "function", 7),
                ("helper", "function", 8),
            ]
        );
    }

    #[test]
    fn ts_symbols_strip_export() {
        let src = "export function foo() {}\nexport default class Bar {}\ninterface Baz {}\n";
        let syms = symbols(src, Some("typescript"));
        assert_eq!(syms[0].name, "foo");
        assert_eq!(syms[0].kind, "function");
        assert_eq!(syms[1].name, "Bar");
        assert_eq!(syms[1].kind, "class");
        assert_eq!(syms[2].name, "Baz");
    }

    #[test]
    fn markdown_headings() {
        let src = "# Title\n\nsome text\n## Section\n";
        let syms = symbols(src, Some("markdown"));
        assert_eq!(syms.len(), 2);
        assert_eq!(syms[0].name, "Title");
        assert_eq!(syms[0].line, 1);
        assert_eq!(syms[1].name, "Section");
        assert_eq!(syms[1].line, 4);
    }

    #[test]
    fn python_and_go() {
        assert_eq!(
            symbols("def main():\n  pass\n", Some("python"))[0].name,
            "main"
        );
        assert_eq!(
            symbols("func Handler() {}\n", Some("go"))[0].name,
            "Handler"
        );
    }

    #[test]
    fn unknown_language_is_empty() {
        assert!(symbols("whatever", Some("plaintext")).is_empty());
        assert!(symbols("whatever", None).is_empty());
    }
}
