#!/usr/bin/env bash
# Run the same checks CI runs for the Rust engine and CLI.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "==> cargo fmt --all --check"
cargo fmt --all -- --check

echo "==> cargo clippy --all-targets --all-features -D warnings"
cargo clippy --all-targets --all-features -- -D warnings

echo "==> cargo test --all-features"
cargo test --all-features

echo "All engine checks passed."
