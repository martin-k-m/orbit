# scripts/

Helper scripts for developing and releasing Orbit. They are plain, dependency-
light shell scripts intended to be run from the repository root.

| Script              | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `bump-version.sh`   | Set a new version across `VERSION`, every `Cargo.toml`, `tauri.conf.json` and both `package.json`s. |
| `check.sh`          | Run the same checks CI runs for the Rust engine (fmt, clippy, test). |
| `gen-icons.sh`      | Regenerate the desktop app icon set from the source PNG via the Tauri CLI. |

Usage:

```bash
scripts/bump-version.sh 1.1.0
scripts/check.sh
scripts/gen-icons.sh
```
