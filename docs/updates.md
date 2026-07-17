# Updates

Orbit checks GitHub Releases for a newer version on launch. If it finds one, a
banner appears; you choose when to install. You can also check any time from
**Settings → Updates**.

## How it works

1. On launch — or when you click **Check for updates** in Settings — Orbit
   fetches `latest.json` from the repository's latest release.
2. It compares that version with the running one.
3. If newer, a banner (and the Settings panel) offer **Install & restart**.
4. Downloading verifies the update's signature against a public key compiled
   into the app. An update that isn't signed by the Orbit release key is
   rejected — a tampered or spoofed release cannot install itself.
5. Orbit installs in place and relaunches.

Nothing is downloaded or installed without you clicking. There is no silent
background update.

## What it sends

Nothing. The update check is a plain GET of a static JSON file on GitHub. No
account, no identifiers, no telemetry — the request is indistinguishable from
opening the releases page in a browser.

If you're offline, the check fails silently and Orbit carries on. Updating is
never required: installers from the
[releases page](https://github.com/martin-k-m/orbit/releases/latest) always work.

## Signing

Update artifacts are signed with a minisign key. The **public** key ships inside
the app (`plugins.updater.pubkey` in `tauri.conf.json`); the **private** key
exists only as a repository secret and never leaves CI.

This is what makes the updater safe to leave on: even if someone published a
release to a fork, or intercepted the download, the signature check fails and
the update is refused.

> **v1.0.0 note:** the very first release shipped *without* updater artifacts —
> the signing key wasn't usable yet, so `latest.json` isn't attached to it.
> Update checks from v1.0.0 therefore no-op. Signing is configured from the next
> release onward. Nothing breaks either way; the check just finds nothing.

## Release channels

Only **stable** today. Every published, non-prerelease GitHub release is an
update candidate. A beta channel is on the [roadmap](../ROADMAP.md) and will be
opt-in.

## Turning it off

The updater only ever *checks* and then asks. If you'd rather it didn't check at
all, block network access for Orbit, or install from the `.deb`/`.AppImage` and
manage updates with your package manager.

## For maintainers

See [releasing.md](./releasing.md) for how the signing key is generated and
which repository secrets a release needs.

The one non-obvious part: the key must be **password-protected**, and both
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` must be
set. Tauri decodes the key with the password supplied; if the key is encrypted
and the password is missing, minisign falls back to an interactive prompt, which
in CI has no TTY and surfaces as the (misleading) error:

```
failed to decode secret key: incorrect updater private key password:
Wrong password for that key
```

## Troubleshooting

**No update appears though a newer release exists.** The release must be
published (not a draft) and have `latest.json` attached. Draft releases are
invisible to the updater — and to everyone else.

**"Install & restart" fails.** On Linux, AppImage self-updates need the
AppImage to be writable; if you installed via `.deb`, update with `apt` instead.

**Signature errors.** The release was signed with a different key than the one
in your build. Download the installer manually.

## Related

- [Installation](./installation.md) · [Releasing](./releasing.md) · [FAQ](./faq.md)
