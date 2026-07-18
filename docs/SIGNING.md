# Code signing — removing the OS security warnings

Orbit's installers are **built and updater-signed** in CI, but OS-level code
signing (what makes macOS Gatekeeper and Windows SmartScreen stop warning users)
requires **paid certificates that only the project owner can obtain**. There is
no way around this — an unsigned binary will always warn, regardless of anything
in the code.

The release pipeline is already wired to sign automatically **the moment the
certificates below are added as repository secrets**. Until then, builds ship
unsigned and the OS will show an "unidentified developer" / "Windows protected
your PC" prompt.

## macOS (Gatekeeper + notarization)

Requires an **Apple Developer Program** membership ($99/year). Create a
_Developer ID Application_ certificate, then add these repo secrets
(Settings → Secrets and variables → Actions):

| Secret | What it is |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64 of the exported `.p12` (Developer ID Application) |
| `APPLE_CERTIFICATE_PASSWORD` | Password for that `.p12` |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Your Apple ID email (for notarization) |
| `APPLE_PASSWORD` | An app-specific password for that Apple ID |
| `APPLE_TEAM_ID` | Your 10-character Apple Team ID |

With these present, `tauri-action` signs **and notarizes** both macOS builds; the
`.dmg`/`.app` then open with no warning.

## Windows (SmartScreen / Authenticode)

Requires an **OV or EV code-signing certificate** from a CA (DigiCert, Sectigo,
etc.). OV builds reputation over time; **EV clears SmartScreen immediately**. Add:

| Secret | What it is |
| --- | --- |
| `WINDOWS_CERTIFICATE` | Base64 of the code-signing `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for that `.pfx` |

The release workflow imports the cert, reads its thumbprint, and points the
Tauri bundler at it, so the `.msi` and `.exe` are Authenticode-signed and
timestamped.

## Linux

`.deb` / `.AppImage` / `.rpm` don't get an OS "unidentified developer" prompt,
so no signing certificate is needed there.

---

Once the secrets exist, just cut a release as usual (`git tag vX.Y.Z`) — signing
happens automatically. Nothing else changes.
