# CLI reference

The `orbit` binary brings the engine that powers the desktop app to your shell.
Every command shares the same detection, health and git logic as the app.

Install it from a clone of the repo:

```bash
cargo install --path crates/orbit-cli
```

A global `--json` flag makes any command emit machine-readable JSON for
scripting.

## Commands

### `orbit scan [PATH]`

Scan a folder and list every project found inside it (defaults to the current
directory).

```console
$ orbit scan ~/code
✔ 5 projects under ~/code

  Blink                   Rust    ◆ Blink
  Beacon                  TypeScript
  ...
```

### `orbit info [PATH]`

Show git, health and dependency detail for a single project.

```console
$ orbit info ./blink
```

### `orbit health [PATH]`

Grade a project's health (0–100) and list the warnings behind the score.

### `orbit deps [PATH]`

List a project's declared dependencies across every ecosystem.

### `orbit git [PATH]`

Show git status: branch, cleanliness, ahead/behind and the last commit.

### `orbit commands [PATH]`

List the commands Orbit can run for a project.

### `orbit run <NAME> [PATH] [--yes]`

Run one of a project's commands, e.g. `orbit run dev`. Commands flagged as
dangerous are refused unless you pass `--yes`:

```console
$ orbit run clean
! This command looks dangerous:
  ! Recursive, forced file deletion (rm -rf / del /s /q / Remove-Item -Recurse -Force)
✖ refusing to run `rm -rf target` without --yes
```

### `orbit init [PATH] [--force]`

Generate a `.project-orbit` profile for a project. Pass `--force` to overwrite an
existing one.

## Scripting with `--json`

```bash
# Projects whose health is below 80
orbit scan ~/code --json \
  | jq -r '.[] | .path' \
  | while read -r p; do
      score=$(orbit health "$p" --json | jq .score)
      [ "$score" -lt 80 ] && echo "$p: $score"
    done
```

## Exit codes

- `0` — success.
- non-zero — an error occurred (message on stderr), or `orbit run` propagated the
  command's own non-zero exit code.
