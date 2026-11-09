# Contributing — architecture

> Repo layout, how to run things, and how to extend Frost. User-facing contribution flow lives in [CONTRIBUTING.md](../../CONTRIBUTING.md).

**Last verified against v0.1.1.**

## Repository layout

```
packages/
  core/            types, config, contracts, errors, env, logging, response helpers
  router/          file discovery, pattern compile/match, generated types
  data/            loaders/memo, CSRF, forms, createServerFn
  react/           document shell, hydration, Link, error boundary
  server/          request handler, SSR, security headers, API dispatch, fetch adapter
  adapter-node/    node:http server, static files, compression
  vite/            Vite plugin (dev server, boundary transform, build)
  test/            in-memory test handler
  cli/             frost dev|build|start|routes
  create-frost-app/ scaffolding CLI + generated templates
examples/starter/  the reference app — single source of truth for the default scaffold
scripts/           sync-template, check-template, e2e-pack, release-*, bench, docs tooling
docs/              this documentation
```

Dependency direction: `core` ← `router`, `data`, `react`, `server` ← `adapter-node`, `vite`, `test`, `cli`. Nothing imports upward.

## Daily workflow

```bash
pnpm install
pnpm dev          # in examples/starter (or scaffold an app)
pnpm typecheck && pnpm test && pnpm build
```

Workspace packages resolve to `dist/` — after editing `packages/*`, run `pnpm build` (or the package's build) before the starter picks it up.

## Tests

- Unit/integration: `pnpm test` (vitest across packages).
- Packaging E2E: `pnpm release:check` — packs tarballs, scaffolds offline, boots prod, asserts HTTP.
- Docs: `pnpm docs:check` (links, snippets, banned words) and `pnpm docs:check-assets` (SVG rules).

## Adding a route convention

1. Extend discovery in `packages/router/src/discovery.ts` (filename regex → `RouteKind`).
2. Handle the kind in `packages/server/src/handler.ts`.
3. Add types in `packages/core/src/types.ts` if the module gains exports.
4. Document in `docs/reference/file-conventions.md` + the relevant guide; add a test in `packages/router`/`server`.

## Adding a package

1. `packages/<name>/` with `src/index.ts`, `package.json` (`@frost.js/<name>`, `workspace:*` deps), tsconfig extending the base.
2. Export through `src/index.ts`; add to the fixed release group in `.changeset/config.json` if user-facing.
3. Docs: `docs/api/<name>.md` + link from `docs/README.md`.

## Release process

Changesets drive versioning (`pnpm changeset`, `pnpm version-packages`). `docs/RELEASING.md` is the authoritative runbook — tarballs come only from `pnpm release:pack`, never the working tree.

## Conventions

- TypeScript strict; ESM (`"type": "module"`); `.js` import specifiers.
- No new runtime deps without discussion; dev-only tooling must be justified in the commit.
- One commit per logical change; commit messages say *why*.
- Windows + Linux both first-class — use `scripts/lib/run.mjs` for process spawning, LF endings for `bin.js`.

## Related

- [CONTRIBUTING.md](../../CONTRIBUTING.md) · [RELEASING.md](../RELEASING.md) · [Decisions](../decisions/)
