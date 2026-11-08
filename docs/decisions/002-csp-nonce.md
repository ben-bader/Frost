# 002 — CSP default and nonce

Context: no CSP existed (audit F7); inline scripts need a nonce to survive an enforced policy.

Options: enforce-by-default (breaks apps), report-only default, opt-in only.

Decision: `security.csp` defaults to a report-only policy (`default-src 'self'`, nonce-based `script-src`, `unsafe-inline` styles). `{nonce}` in any custom policy is replaced per request; the nonce is generated in the request handler, stored on `context.cspNonce`, echoed into `FrostClientState`, and applied to every script Frost emits. `cspMode: "enforce"` switches the header; `security.csp: false` disables it. HSTS is strictly opt-in; Permissions-Policy denies camera/mic/geolocation by default.

Consequences: safe rollout (report-only cannot break pages); nonce plumbing touches context, document, and metadata script rendering; custom policies without `{nonce}` must allow their own script sources.
