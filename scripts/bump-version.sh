#!/usr/bin/env bash
# Set a new version across every place Orbit records one.
# Usage: scripts/bump-version.sh <new-version>   e.g. 1.1.0
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: scripts/bump-version.sh <new-version>" >&2
  exit 1
fi

version="$1"
if ! echo "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+([.-].+)?$'; then
  echo "error: '$version' is not a semver version (e.g. 1.2.3)" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "$version" > VERSION

# Workspace crates (orbit-core, orbit-cli inherit version.workspace).
sed -i.bak -E "s/^version = \"[0-9][^\"]*\"/version = \"$version\"/" Cargo.toml && rm -f Cargo.toml.bak

# Desktop crate + Tauri config.
sed -i.bak -E "s/^version = \"[0-9][^\"]*\"/version = \"$version\"/" apps/desktop/src-tauri/Cargo.toml && rm -f apps/desktop/src-tauri/Cargo.toml.bak
sed -i.bak -E "s/(\"version\": )\"[0-9][^\"]*\"/\1\"$version\"/" apps/desktop/src-tauri/tauri.conf.json && rm -f apps/desktop/src-tauri/tauri.conf.json.bak

# Frontend + website package manifests.
sed -i.bak -E "s/(\"version\": )\"[0-9][^\"]*\"/\1\"$version\"/" apps/desktop/ui/package.json && rm -f apps/desktop/ui/package.json.bak
sed -i.bak -E "s/(\"version\": )\"[0-9][^\"]*\"/\1\"$version\"/" apps/website/package.json && rm -f apps/website/package.json.bak

echo "Bumped Orbit to v$version."
echo "Next: update CHANGELOG.md and RELEASE_NOTES.md, then tag: git tag v$version"
