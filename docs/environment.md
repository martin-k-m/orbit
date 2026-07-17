# Environment variables

Orbit reads your project's `.env` files, shows them in one place, masks the
values that look like secrets, and tells you what's wrong with them — duplicate
keys, blank values, invalid names, and variables your `.env.example` promises
but a real environment is missing.

Everything is local. Values are never uploaded, and never written to logs.

## Which files Orbit reads

Orbit looks for these at the project root and infers what each one is for:

| File | Scope |
| --- | --- |
| `.env` | default |
| `.env.local` | local (machine-specific, usually git-ignored) |
| `.env.development`, `.env.dev` | development |
| `.env.production`, `.env.prod` | production |
| `.env.test` | test |
| `.env.example`, `.env.sample`, `.env.template` | template |
| `.env.<anything>` | shown under its own name (e.g. `staging`) |

## Supported syntax

Orbit follows common dotenv conventions:

```bash
# A comment
DATABASE_URL=postgres://localhost:5432/app
export API_TOKEN="abc123"          # `export` prefix is fine
QUOTED='single quoted'
WITH_COMMENT=value # trailing comment is stripped
HASH_IN_QUOTES="a#b"               # '#' inside quotes stays literal
EQUALS_IN_VALUE=key=value          # only the first '=' splits
EMPTY=
```

- Blank lines and `#` comments are ignored.
- Surrounding single or double quotes are stripped.
- In an **unquoted** value, ` #` starts a trailing comment. Inside quotes it
  doesn't.
- Only the **first** `=` splits key from value, so URLs and tokens survive.

## Secret masking

Orbit flags a variable as a secret from its **name**, never by inspecting the
value, and masks it in the UI (keeping a couple of trailing characters so you
can still recognise it):

```
API_TOKEN      ••••••••••••YB
DATABASE_URL   postgres://localhost:5432/app
```

A name is treated as a secret if it contains any of `SECRET`, `TOKEN`,
`PASSWORD`, `PASSWD`, `APIKEY`, `API_KEY`, `PRIVATE`, `CREDENTIAL`, `AUTH`,
`SESSION`, `SIGNING`, `CERT`, `DSN`, `ACCESS_KEY`, `CLIENT_SECRET` — or ends
with `_KEY`.

So `STRIPE_SECRET_KEY` and `AWS_ACCESS_KEY_ID` are masked; `PORT` and
`NODE_ENV` are not.

> **This is a display convenience, not encryption.** Orbit doesn't encrypt your
> `.env` files — they stay exactly as they are on disk. Keep secrets out of
> version control (`.gitignore` your `.env`) and commit only `.env.example`.

## What Orbit reports

| Issue | Meaning |
| --- | --- |
| `duplicate` | The same key is defined twice in one file. The **last** one wins at runtime, which is a common source of confusion. |
| `empty` | A key has no value. Not reported for template files, where blanks are expected. |
| `invalid-key` | The name isn't a valid environment variable (must start with a letter or `_`, then letters/digits/`_`). |
| `missing` | A key exists in `.env.example` but is absent from a real environment file — the classic "works on my machine" bug. |

Example:

```
.env
  ⚠ `PORT` is defined twice (lines 3 and 9) — the last value wins
  ⚠ `SENTRY_DSN` is in .env.example but missing here
```

## Keeping `.env.example` honest

The `missing` check is the reason to maintain a template. Commit an
`.env.example` listing every variable your app needs with blank values:

```bash
# .env.example
PORT=
DATABASE_URL=
API_TOKEN=
```

Orbit then tells every teammate exactly which variables their `.env` is missing,
instead of them finding out via a runtime crash.

## From the CLI

The engine that powers this is `orbit_core::env`, shared with the desktop app,
so both agree on what a variable is and whether it's a secret.

## Related

- [Configuration](./configuration.md) — `.project-orbit` profiles and app data.
- [Workspace](./workspace.md) — what else Orbit remembers per project.
- [Troubleshooting](./troubleshooting.md)
