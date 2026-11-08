# Middleware

Place `app/_middleware.ts` (or `app/middleware.ts`) at the app root. It
runs **before routing** for pages and APIs:

```ts
import type { FrostMiddleware } from "@frost.js/core";

export const middleware: FrostMiddleware = async (request, context, next) => {
  // Guard: short-circuit with a Response
  if (request.headers.get("authorization") !== "Bearer …") {
    return new Response("Unauthorized", { status: 401 });
  }
  // Continue: call next() and optionally post-process
  const response = await next();
  response?.headers.set("x-request-id", crypto.randomUUID());
  return response; // or return undefined — next() is memoized
};
```

- Export `middleware` (single fn or array, run in order) or `default`.
- `next()` delegates to the remaining middlewares then the router; its
  result is memoized, so calling it and returning `undefined` does not
  re-run loaders.
- Returning a `Response` short-circuits; returning `undefined` continues.
- Errors are reported as `FROST_E_MIDDLEWARE` and render a 500 document.
