# Releasing

How Orbit is versioned, built, signed and published. This is for maintainers.

## Versioning

Orbit uses [semantic versioning](https://semver.org). The version is recorded in
several files kept in sync by a script:

```bash
scripts/bump-version.sh 1.1.0
```

That updates `VERSION`, the workspace `Cargo.toml`, the desktop crate's
`Cargo.toml`, `apps/desktop/src-tauri/tauri.conf.json` and both `package.json`s.
Then update `CHANGELOG.md` and `RELEASE_NOTES.md`.

## Cutting a release

1. `scripts/bump-version.sh <version>` and update the changelog / release notes.
2. Commit and merge to `main`.
3. Tag and push:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
4. The [`release`](../.github/workflows/release.yml) workflow builds signed
   installers for macOS (Intel + Apple Silicon), Windows and Linux, generates the
   updater `latest.json`, and creates a **draft** GitHub Release with everything
   attached.
5. Review the draft, paste the release notes, and publish it.

The [`build`](../.github/workflows/build.yml) workflow builds the same targets on
every push to `main` (without signing) so packaging breakage is caught early.

## Auto-update & signing

Orbit ships the Tauri updater, pointed at:

```
https://github.com/martin-k-m/orbit/releases/latest/download/latest.json
```

Update artifacts must be signed with a minisign key. The **public** key is
committed in `tauri.conf.json` (`plugins.updater.pubkey`). The **private** key is
a secret.

### One-time key setup

Generate a keypair (either with the Tauri CLI or Orbit's helper) and put the
public key in `tauri.conf.json`:

```bash
cargo tauri signer generate -w ~/.orbit/updater.key
# copy the printed public key into plugins.updater.pubkey
```

Then add two repository secrets (Settings → Secrets and variables → Actions):

| Secret                               | Value                                  |
| ------------------------------------ | -------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | contents of the generated private key  |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the key's password (empty if none)     |

Regular builds set `createUpdaterArtifacts: false`, so they need no secrets. The
release workflow overlays `apps/desktop/src-tauri/tauri.release.json`, which flips
`createUpdaterArtifacts: true`, and signs with the secret above.

### `latest.json`

`tauri-action` generates and uploads `latest.json` alongside the installers. It
looks like:

```json
{
  "version": "1.1.0",
  "notes": "See the release notes.",
  "pub_date": "2026-07-16T00:00:00Z",
  "platforms": {
    "darwin-aarch64": { "signature": "…", "url": "https://github.com/martin-k-m/orbit/releases/download/v1.1.0/Orbit_aarch64.app.tar.gz" },
    "windows-x86_64": { "signature": "…", "url": "https://github.com/martin-k-m/orbit/releases/download/v1.1.0/Orbit_1.1.0_x64_en-US.msi.zip" }
  }
}
```

On launch the app fetches this file, compares versions, and (if newer) downloads,
verifies the signature against the embedded public key, installs and relaunches.

## macOS signing & notarization

Pre-1.0 builds are unsigned. For notarized macOS releases, add these secrets and
Tauri/`tauri-action` will sign and notarize automatically:

| Secret                        | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `APPLE_CERTIFICATE`           | base64 of the Developer ID `.p12`        |
| `APPLE_CERTIFICATE_PASSWORD`  | password for the `.p12`                  |
| `APPLE_SIGNING_IDENTITY`      | e.g. `Developer ID Application: … (TEAMID)` |
| `APPLE_ID`                    | Apple ID email                           |
| `APPLE_PASSWORD`              | app-specific password                    |
| `APPLE_TEAM_ID`               | your team id                             |

## Windows signing

Provide an Authenticode certificate to remove SmartScreen warnings. Configure
`bundle.windows.certificateThumbprint` (or the signing env used by your CI) with
a code-signing certificate stored as a secret.
