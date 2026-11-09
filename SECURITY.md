# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | Yes — current release line |
| < 0.1 | No |

Frost is pre-1.0; only the latest release receives fixes.

## Reporting a vulnerability

**Do not open a public issue.** Report privately via [GitHub Security Advisories](https://github.com/ben-bader/Frost/security/advisories/new) ("Report a vulnerability").

Include:

- Frost version(s) affected (`npm ls @frost.js/core` or the scaffold's `package.json`)
- Node version and OS
- A description of the issue and reproduction steps
- Impact assessment if known

We'll acknowledge within a few days, investigate, and coordinate a fix + advisory. If the advisory channel isn't available to you, email the maintainer listed on the npm profile.

## Scope notes

- The framework's security surface: request handling, static file serving, CSP/headers, CSRF on mutations, body limits, env boundary, and the dev server protocol.
- Applications built with Frost are responsible for their own auth, sessions, secrets handling, and TLS termination — see [docs/guides/security.md](docs/guides/security.md) for what Frost does and does not cover.
