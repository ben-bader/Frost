# Routing

Frost discovers routes from the filesystem under `appDirectory`
(default `src/app`). Every `page.tsx`/`page.jsx` file is a route;
`layout.tsx` files nest around their directory's pages.

## Conventions

| File | Kind | URL |
| --- | --- | --- |
| `app/page.tsx` | page | `/` |
| `app/about/page.tsx` | page | `/about` |
| `app/blog/[slug]/page.tsx` | page | `/blog/:slug` |
| `app/docs/[...path]/page.tsx` | catch-all | `/docs/*` |
| `app/blog/layout.tsx` | layout | wraps `/blog/*` pages |
| `app/error.tsx` / `_error.tsx` | error boundary | nearest match wins |
| `app/not-found.tsx` / `_404.tsx` | 404 | app root only |
| `app/_middleware.ts` / `middleware.ts` | middleware | app root only |

API routes live under `apiDirectory` (default `src/api`) and map to
`/api/**`. A file `src/api/hello/route.ts` serves `/api/hello` and
exports `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`
handlers receiving `(request, context)`.

## Matching

- Pathname is percent-decoded once per segment; malformed escapes
  return 400. Encoded slashes (`%2F`) stay inside their segment.
- Static segments beat dynamic; deeper routes beat shallower ones.
- Unsupported methods on pages return 405 with an `Allow` header.
- `OPTIONS`/`HEAD` on API routes are handled automatically unless the
  module exports its own.

## Programmatic links

`<Link to="/path">` renders a real anchor. Frost hydrates one document
at a time, so navigation is a full document load **unless**
`config.router.enabled` is set — see `client-router.md`.
