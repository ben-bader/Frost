# Documentation index

> Everything about Frost, grouped by what you're doing.

## Learn

| Page | What it covers |
|---|---|
| [Getting started](getting-started.md) | Zero to running app — scaffold contents file by file |
| [Concepts](concepts.md) | Explicit execution, the mental model, vocabulary |
| [Architecture](architecture.md) | Packages, dependency graph, request lifecycle, pipelines |
| [Rendering](rendering.md) | SSR, streaming, hydration, determinism |

## Guides

| Page | What it covers |
|---|---|
| [Routing](guides/routing.md) | File conventions, dynamic/catch-all, layouts, 404/error |
| [Data loading](guides/data-loading.md) | Loaders, actions, forms, server functions |
| [Contracts & types](guides/contracts-and-types.md) | Validation, generated types, typed links |
| [Layouts & metadata](guides/layouts-and-metadata.md) | Head, titles, OG, JSON-LD |
| [Middleware](guides/middleware.md) | `app/_middleware.ts` |
| [API routes](guides/api-routes.md) | `src/api/**/route.ts` |
| [Error handling](guides/error-handling.md) | Error shape, codes, overlay, boundaries |
| [Environment variables](guides/environment-variables.md) | `.env`, `FROST_PUBLIC_*`, required vars |
| [Styling](guides/styling.md) | CSS pipeline, Tailwind, fonts |
| [Client router](guides/client-router.md) | Opt-in navigation, prefetch |
| [Dev server](guides/dev-server.md) | Reload protocol, Fast Refresh, Windows notes |
| [Security](guides/security.md) | CSP, headers, CSRF, boundaries |
| [Performance](guides/performance.md) | Compression, budgets, measured numbers |
| [Testing](guides/testing.md) | `@frost.js/test` |
| [Deployment](guides/deployment.md) | Node, Docker, fetch adapter |
| [Upgrading](guides/upgrading.md) | Versions, changelog, migrations |

## Reference

| Page | What it covers |
|---|---|
| [Configuration](reference/configuration.md) | Every `frost.config.ts` option |
| [CLI](reference/cli.md) | `frost` commands and flags |
| [Error codes](reference/error-codes.md) | All `FROST_E_*` codes |
| [File conventions](reference/file-conventions.md) | Cheat sheet |
| [create-frost-app](reference/create-frost-app.md) | Scaffold flags and templates |
| [API: core](api/core.md) · [router](api/router.md) · [data](api/data.md) · [react](api/react.md) · [server](api/server.md) · [adapter-node](api/adapter-node.md) · [vite](api/vite.md) · [test](api/test.md) · [cli](api/cli.md) | Public exports per package |

## Project

| Page | What it covers |
|---|---|
| [Comparison](project/comparison.md) | vs Next.js, React Router, TanStack Start — sourced |
| [Roadmap](project/roadmap.md) | Next / later / exploring |
| [FAQ](project/faq.md) | Short answers |
| [Troubleshooting](project/troubleshooting.md) | Windows-first fixes |
| [Glossary](project/glossary.md) | Terms used across docs |
| [Contributing — architecture](project/contributing-architecture.md) | Repo layout, extending Frost |

## Also in this folder

- [RELEASING.md](RELEASING.md) — release runbook
- [MANUAL_TESTS.md](MANUAL_TESTS.md) — pre-release browser checklist
- [decisions/](decisions/) — architecture decision records
- [adr/](adr/) · [architecture/](architecture/) · [spec/](spec/) — deeper design docs
