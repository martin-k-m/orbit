#!/usr/bin/env bash
# Regenerate the desktop app icon set from the canonical source PNG.
# Requires the Tauri CLI (`cargo install tauri-cli --version "^2"`).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

src="apps/desktop/src-tauri/icons/app-icon.png"
out="apps/desktop/src-tauri/icons"

if [ ! -f "$src" ]; then
  echo "error: source icon not found at $src" >&2
  exit 1
fi

cargo tauri icon "$src" --output "$out"
echo "Icon set regenerated in $out"
