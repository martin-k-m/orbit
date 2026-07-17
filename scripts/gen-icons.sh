#!/usr/bin/env bash
# Regenerate the desktop app icon set from the canonical source.
# Requires the Tauri CLI (`cargo install tauri-cli --version "^2"`).
#
# The brand master is `app-icon.svg` (red-600 → rose-500, matching the app and
# website). `cargo tauri icon` wants a large PNG, so export the SVG to
# `app-icon.png` at 1024×1024 first (any rasteriser: rsvg-convert, Inkscape,
# ImageMagick, or a browser "save as PNG"), then run this script.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

src="apps/desktop/src-tauri/icons/app-icon.png"
out="apps/desktop/src-tauri/icons"

if [ ! -f "$src" ]; then
  echo "error: source icon not found at $src" >&2
  echo "hint: export apps/desktop/src-tauri/icons/app-icon.svg to app-icon.png (1024×1024) first" >&2
  exit 1
fi

cargo tauri icon "$src" --output "$out"
echo "Icon set regenerated in $out"
