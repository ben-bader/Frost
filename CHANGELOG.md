# Changelog

## 0.1.0

### Breaking
- Removed the dead `rendering` config section, the per-route
  `rendering` export, and the `RenderingMode`/`RenderingConfig`
  types. They were never read at runtime; all routes are SSR.
  Migration: delete `rendering` from `frost.config.ts` and any
  `export const rendering` in route modules.

### Added
- `frost.config.ts|.js|.mjs` loading via the CLI (`--config` supported).
- `.env` file loading (`.env`, `.env.local`, `.env.<mode>`,
  `.env.<mode>.local`); only `FROST_PUBLIC_*` reaches client bundles.
- `config.env.required` fail-fast validation.
- CSP nonce + report-only/enforce modes, Permissions-Policy, HSTS opt-in.
- App-root middleware (`app/_middleware.ts` or `app/middleware.ts`).
- Layout loaders/actions/metadata, `app/not-found`, error boundaries.
- Route `metadata`/`headers` exports, title templates, OG/Twitter,
  JSON-LD, canonical, robots meta.
- `config.seo.sitemap`/`seo.robots` + `seo.baseUrl` build generation.
- Leveled logger (`config.logging`) with per-request logs.
- Lazy production route loading, `assets.json` manifest,
  modulepreload/font preloads, br/gzip precompression + on-the-fly
  compression, `--analyze` bundle report, `budgets.clientJsKb`.
- Dev `frost:*` reload/error protocol, browser overlay, Fast Refresh,
  in-process config restart, determinism check (`dev.checkDeterminism`).
- Progressive-enhancement fetch upgrade for same-document POST forms.
- Structured `FrostErrorReport` codes (`FROST_E_*`).
