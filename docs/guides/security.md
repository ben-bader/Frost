# Security

> CSP nonces, security headers, CSRF, body limits, static-file containment, and the client env boundary.

**Last verified against v0.1.1.**

## Content Security Policy

`security.csp` is enabled by default in **report-only** mode. The policy template supports a `{nonce}` placeholder replaced with a per-request nonce:

```
default-src 'self'; script-src 'self' 'nonce-{nonce}';
style-src 'self' 'unsafe-inline'; img-src 'self' data:;
font-src 'self' data:; connect-src 'self';
frame-ancestors 'self'; base-uri 'self'; form-action 'self'
```

- `security.csp: false` disables CSP; a string sets it verbatim.
- `security.cspMode: "enforce"` switches `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
- Inline scripts Frost emits (hydration payload, metadata `scripts[].content`) get the nonce automatically; `meta.scripts[].content` is `</script`/`<!--`-escaped.

## Always-on headers

`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (default denies camera/microphone/geolocation). HTML responses are `Cache-Control: no-cache`.

- `security.hsts` — opt-in: `true` for defaults (maxAge 1y, includeSubDomains) or an object `{ maxAge, includeSubDomains, preload }`.
- `security.permissionsPolicy` — string verbatim, `false` to disable, or `Record<feature, allowlist>`.

## Request safety

- **Static containment** — real `path.resolve` + `realpath` checks block traversal, `%2e%2e`, backslash, symlink, and UNC escapes when serving `public/`.
- **Body limits** — `limits.formBytes`/`limits.jsonBytes` (default 1 MiB) count bytes while streaming → 413 `FROST_E_BODY`.
- **CSRF** — POST actions and server-function RPC validate origin (`validateCsrf` in `@frost.js/data`).
- **Client boundary** — client code reading non-`FROST_PUBLIC_*` `process.env.*` fails the build (`FROST_E_BOUNDARY`); server-only imports are enforced transitively.
- **Env allowlist** — only `FROST_PUBLIC_*` reaches the client bundle.

## What Frost does not do

- No built-in auth, sessions, or rate limiting — implement in middleware or loaders.
- No automatic HTTPS — terminate TLS at your proxy/host; enable `security.hsts` only behind TLS.
- CSP is report-only by default — review reports, then switch to `enforce` deliberately.

See `docs/architecture/threat-model.md` and `docs/decisions/002-csp-nonce.md`, `003-static-containment.md`, `004-env-allowlist.md`, `005-body-limits.md` for the reasoning.

## Related

- [Environment variables](environment-variables.md) · [Middleware](middleware.md)
