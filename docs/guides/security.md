# Security

## CSP

`security.csp` (enabled by default, **report-only** mode) emits a
per-request nonce into the hydration script and any inline script Frost
produces. Policy template supports `{nonce}`; set
`security.cspMode: "enforce"` to switch to `Content-Security-Policy`.

Always-on headers: `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`. `security.hsts` is opt-in.
HTML responses are `Cache-Control: no-cache`.

`meta.scripts[].content` inline scripts are `</script`/`<!--`-escaped
and require the nonce under CSP — see `layouts-metadata.md`.

## Request safety

- **Static containment**: real `path.resolve` + `realpath` checks block
  traversal, `%2e%2e`, backslash, symlink, and UNC escapes.
- **Body limits**: `limits.formBytes` (default 1 MB) counts bytes while
  streaming → 413.
- **CSRF**: POST actions and server-function RPC validate origin.
- **Client boundary**: client code reading non-`FROST_PUBLIC_*`
  `process.env.*` fails the build; server-only imports are enforced
  transitively.
- **Env allowlist**: only `FROST_PUBLIC_*` reaches the client.

See `docs/architecture/threat-model.md` for the full model.
