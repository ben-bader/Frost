# Upgrading

> Versioning, breaking changes, and migration notes between Frost releases.

**Last verified against v0.1.1.**

## Versioning

Frost uses [Changesets](https://github.com/changesets/changesets). All framework packages ship in a **fixed group** — they share one version (`0.1.x`) and are released together. `create-frost-app` versions independently.

| Package | Current |
|---|---|
| `@frost.js/core`, `router`, `data`, `react`, `server`, `adapter-node`, `vite`, `test`, `cli` | 0.1.1 |
| `create-frost-app` | 0.1.1 |

Pre-1.0: breaking changes can land in minor versions; the changelog and this page call them out. After 1.0, semver applies strictly.

## Changelog

Every release updates `CHANGELOG.md` at the repo root and each package's own `CHANGELOG.md`. Read the diff of the versions you're crossing — entries are grouped by package and type (major/minor/patch).

## Between 0.1.0 and 0.1.1

The only change is `create-frost-app`: the default scaffold is now the full starter (Tailwind, bento components, playground, API routes) instead of the minimal "Hello, Frost" app. Existing projects are unaffected. To get the minimal scaffold: `npm create frost-app@latest my-app -- --template minimal`.

## Upgrading a project

1. Bump framework deps: `npm install @frost.js/core@latest @frost.js/router@latest …` (or all `@frost.js/*` together).
2. `npm run build && npm run typecheck` — contract types are generated, so type errors surface API breaks.
3. Regenerate contracts if your route tree changed: `frost contracts` (or let `dev`/`build` do it).
4. Check `docs/troubleshooting.md` and this page for migration notes.

`create-frost-app` only affects new projects — never upgrade it inside an existing app.

## Migration notes

No migration guides yet — 0.1.x has had one patch release. Breaking-change entries will be added here as they ship.

## Related

- [Releasing](../RELEASING.md) · [Changelog](../../CHANGELOG.md) · [Troubleshooting](../project/troubleshooting.md)
