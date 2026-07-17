# Orbit developer tasks. Install `just`: https://github.com/casey/just
# Run `just` to list recipes.

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

ui  := "apps/desktop/ui"
tauri := "apps/desktop/src-tauri/tauri.conf.json"

# List available recipes
default:
    @just --list

# Format all Rust code
fmt:
    cargo fmt --all

# Lint the engine and CLI (warnings denied)
lint:
    cargo clippy --all-targets --all-features -- -D warnings

# Run the engine test suite
test:
    cargo test --all-features

# All the checks CI runs for the engine
check: fmt lint test

# Run the CLI against a folder, e.g. `just scan ~/code`
scan path=".":
    cargo run -p orbit-cli -- scan {{path}}

# Install desktop frontend dependencies
ui-install:
    npm --prefix {{ui}} install

# Run the desktop app in development
dev: ui-install
    cargo tauri dev --config {{tauri}}

# Build desktop installers
build: ui-install
    cargo tauri build --config {{tauri}}

# Regenerate the app icon set from the source PNG
icons:
    cargo tauri icon apps/desktop/src-tauri/icons/app-icon.png --output apps/desktop/src-tauri/icons

# Run the marketing website in development
web:
    npm --prefix apps/website install
    npm --prefix apps/website run dev
