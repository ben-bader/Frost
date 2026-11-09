# Routing

> File conventions, dynamic segments, nested layouts, 404s, and error routes.

**Last verified against v0.1.1.**

Frost discovers routes from the filesystem under `appDirectory` (default `src/app`). Every `page.tsx`/`page.jsx` file is a route; `layout.tsx` files nest around every page in their directory subtree. API routes live under `apiDirectory` (default `src/api`) — see [api routes](api-routes.md).

## Conventions

| File | Kind | URL |
|---|---|---|
| `app/page.tsx` | page | `/` |
| `app/about/page.tsx` | page | `/about` |
| `app/blog/[slug]/page.tsx` | page | `/blog/:slug` |
| `app/docs/[...path]/page.tsx` | catch-all | `/docs/*` |
| `app/blog/layout.tsx` | layout | wraps `/blog/*` pages |
| `app/error.tsx` / `_error.tsx` | error boundary | nearest match wins |
| `app/not-found.tsx` / `_404.tsx` | 404 | app root only |
| `app/_middleware.ts` / `middleware.ts` | middleware | app root only |

Layouts compose root-first: `app/layout.tsx` wraps `app/blog/layout.tsx`, which wraps `app/blog/[slug]/page.tsx`. Each layout's loader runs in parallel with the page's — see [data loading](data-loading.md).

## Matching

- Static segments beat dynamic ones; deeper routes beat shallower ones.
- Pathnames are percent-decoded once per segment; malformed escapes return 400. Encoded slashes (`%2F`) stay inside their segment.
- Unsupported methods on pages return 405 with an `Allow` header.
- `OPTIONS`/`HEAD` on API routes are handled automatically unless the module exports its own.

## Route modules

A route file may export any of:

| Export | Runs | Purpose |
|---|---|---|
| `default` | server (render) | The page/layout component |
| `loader` | server | Produce `data` for the component |
| `action` | server | Handle POST to the route URL |
| `metadata` | server | `<head>` metadata (object or function) |
| `headers` | server | Per-request response headers |
| `contract` | both | Runtime validation spec |
| `middleware` | server | App-root middleware only |

Full types: `Route.LoaderArgs`, `Route.ActionArgs`, `Route.ComponentProps`, `Route.Metadata`, `RouteHeaders` in `@frost.js/core`.

## 404 and error routes

- `app/not-found.tsx` renders unmatched paths inside the root layout with status 404. Without one, Frost renders a minimal styled `FrostDocument` — never a bare text response.
- `error.tsx`/`_error.tsx` is the nearest error boundary for the subtree below it. It renders inside the layout chain and receives `{ error, data, params }`.
- Loader/action/render errors propagate to the nearest boundary and are reported as `FROST_E_LOADER`/`FROST_E_ACTION`/`FROST_E_RENDER`. See [error handling](error-handling.md).

## Programmatic links

`<Link to="/path">` from `@frost.js/react` renders a real anchor. By default navigation is a full document load; with `router.enabled` it becomes client-side — see [client router](client-router.md). When `.frost/types/routes.d.ts` is generated (dev/build), `to`/`href` accept only known routes.

## Inspect routes

```bash
frost routes
```

Prints every discovered route with its kind, contract/layout/loader/action status. See [CLI](../reference/cli.md).

## Common mistakes

- **`page.ts` instead of `page.tsx`** — both work, but components need JSX so `page.tsx` is the convention.
- **Loader in a non-route file** — loaders only run when exported from `page.tsx`/`layout.tsx`. Shared loaders belong in `src/data/` and are called from route loaders.
- **Catch-all without a base** — `[...path]` requires at least one segment; use a sibling `page.tsx` for the bare path.

## Related

- [File conventions cheat sheet](../reference/file-conventions.md)
- [Data loading](data-loading.md) · [Contracts & types](contracts-and-types.md)
