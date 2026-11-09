# Middleware

> `app/_middleware.ts` — a single request hook that runs before routing for pages and APIs.

**Last verified against v0.1.1.**

## What it is

One file — `src/app/_middleware.ts` or `src/app/middleware.ts` — exports a `FrostMiddleware` (or an array of them, or a default export). It runs once per dynamic request, before route matching.

```ts
// src/app/_middleware.ts
import type { FrostMiddleware } from "@frost.js/core";

export const middleware: FrostMiddleware = async (request, context, next) => {
  const start = performance.now();
  const response = await next();
  if (response) {
    response.headers.set("server-timing", `total;dur=${performance.now() - start}`);
  }
  return response;
};
```

## Signature

```ts
(request: Request, context: FrostRequestContext, next: () => Promise<Response | void>)
  => Response | void | Promise<Response | void>
```

- Return a `Response` to short-circuit (auth redirects, maintenance pages, canned JSON).
- Return `undefined` or the result of `next()` to continue the chain.
- `next()` is memoized — calling it twice reuses the same downstream response instead of re-running routing.
- Multiple functions compose in order (array export or chained `next()` calls).

## Execution order

```
request
  → adapter static check      (public/ files served here — middleware does NOT run)
  → app/_middleware.ts chain  (once, for pages AND api routes)
  → route match
      → loader(s) / action
      → render → stream → HTML
```

Notes:

- Static files in `public/` are served by the adapter **before** `handleRequest` — middleware never sees them.
- There is **no nested route middleware** — only the app-root file is discovered; `_middleware.ts` in subdirectories is ignored.
- API routes get the same middleware pass as pages.

## The context

`context` is the request's `FrostRequestContext` — `requestId`, `ip`, `userAgent`, `params`, `url`, and shared fields. Mutate it to pass data to loaders/actions (`context.user = …`), though for per-route data prefer loader returns.

## Errors

A throw inside middleware produces a 500 with a `FROST_E_MIDDLEWARE` report through `onError` — same overlay/terminal pipeline as route errors.

## Common mistakes

- **Putting it in `src/middleware.ts`** — the file must live in `src/app/` (`_middleware.ts` or `middleware.ts`).
- **Expecting it to guard static assets** — static files bypass it entirely; protect sensitive files by not putting them in `public/`.
- **Nested `_middleware.ts` files** — ignored; there is one app-level middleware chain only.
- **Rewrites** — return a redirect `Response` instead; internal rewrite is not implemented.

## Related

- [Concepts](../concepts.md) — request context · [Security](security.md) · `docs/decisions/010-layouts-errors-metadata.md`
