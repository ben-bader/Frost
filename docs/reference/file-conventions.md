# File conventions

> Cheat sheet — every file Frost discovers and what it must export. Source: `packages/router/src/discovery.ts`.

**Last verified against v0.1.1.**

## `src/app/` (pages & chrome)

| File | Kind | Exports |
|---|---|---|
| `page.tsx` | page | `default` component; optional `loader`, `action`, `metadata`, `headers`, `contract` |
| `layout.tsx` | layout | `default` component receiving `{ children }`; same optional exports |
| `_middleware.ts` / `middleware.ts` | middleware | `middleware` (`FrostMiddleware` or array) or `default` — **app root only** |
| `not-found.tsx` / `_404.tsx` | not-found | `default` component — **app root only** |
| `error.tsx` / `_error.tsx` | error boundary | `default` component — per directory |

## Routing syntax

| Pattern | Matches |
|---|---|
| `about/page.tsx` | `/about` |
| `[id]/page.tsx` | `/123` → `params.id` |
| `[...slug]/page.tsx` | `/a/b/c` → `params.slug = ["a","b","c"]` |
| `[[...slug]]/page.tsx` | optional catch-all (also matches parent) |

## `src/api/` (API routes)

| File | Kind | Exports |
|---|---|---|
| `route.ts` | api | HTTP verbs: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`; optional `contract` |

Dynamic segments and catch-alls work the same as pages.

## Ignored

Files starting with `_` (other than the middleware/not-found conventions above), `*.test.*`, anything under `node_modules`. Test files are excluded from discovery.

## Special directories

| Dir | Purpose |
|---|---|
| `public/` | Static files served by the adapter before routing |
| `.frost/` | Build output (`client/`, `server/`) — git-ignored |

## Related

- [Routing](../guides/routing.md) · [API routes](../guides/api-routes.md) · [Configuration](configuration.md) (`appDirectory`, `apiDirectory`, `publicDirectory`)
