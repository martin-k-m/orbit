# Security Policy

## Supported versions

Orbit is pre-1.0. Security fixes are applied to the latest release on `main`.

## Reporting a vulnerability

Please report security issues **privately**. Do not open a public GitHub issue.

- Use GitHub's [private vulnerability reporting](https://github.com/martin-k-m/orbit/security/advisories/new)
  ("Report a vulnerability" under the Security tab), or
- email the maintainers with details and reproduction steps.

We aim to acknowledge reports within a few days and to ship a fix or mitigation
as quickly as the severity warrants. We'll credit you in the release notes
unless you prefer to remain anonymous.

## Scope & posture

Orbit is local-first: it has no server, no account and no telemetry, so the
attack surface is deliberately small. Areas we care most about:

- Command execution: Orbit runs project commands in their own directory. Reports
  of unexpected command execution or argument injection are high priority.
- The Tauri capability set (`apps/desktop/src-tauri/capabilities/`) and
  the content-security policy.
- Parsing of untrusted manifests (`Cargo.toml`, `package.json`, `.project-orbit`).

`orbit-core` forbids `unsafe` code.
