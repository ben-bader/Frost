# Testing

> `@frost.js/test` utilities and patterns for testing routes without a browser.

**Last verified against v0.1.1.**

## @frost.js/test

The package builds request handlers from in-memory route modules — no filesystem, no Vite, no browser:

```ts
import { createTestHandler, renderRoute, callLoader, callAction } from "@frost.js/test";
```

### createTestHandler

```ts
const handler = createTestHandler({
  routes,                    // DiscoveredRoute[] — from discoverRoutes() or hand-written
  modules: {
    "src/app/page.tsx": pageModule,   // keyed by route.filePath (or route.id)
  },
  // ...any RequestHandlerOptions (config, onError, etc.)
});

const res = await handler(new Request("http://localhost/"));
```

The returned function is the same `(request) => Promise<Response>` the production server uses — status, headers, body, compression behavior all apply.

### renderRoute

Render a single route module to an HTML `Response` (loaders run):

```ts
const res = await renderRoute(pageModule, {
  request, params: { name: "world" }, pathname: "/hello/world",
});
```

### callLoader / callAction

Invoke route exports directly with a mock request:

```ts
const data = await callLoader(routeModule, { request, params: { id: "1" } });
const result = await callAction(routeModule, { request }); // POST by default
```

Throws a clear error if the module doesn't export the function.

## Patterns

- **Loader unit tests** — call `callLoader` with a stub `Request`/`params`; assert the returned data or thrown error code.
- **Handler tests** — `createTestHandler` + real `Request` objects; assert status, headers, and body content. This is how the repo's own server tests work (`packages/server/src/__tests__/`).
- **Contract tests** — feed invalid params/search through the handler; expect 400 `FrostErrorReport` bodies.
- **E2E** — the repo's `scripts/e2e-pack.mjs` packs all packages, scaffolds an app from tarballs, installs offline, typechecks, builds, boots the prod server, and asserts HTTP responses. Run `pnpm release:check` for the full gate.

## Example

```ts
import { describe, it, expect } from "vitest";
import { createTestHandler } from "@frost.js/test";
import { discoverRoutes } from "@frost.js/router";
import * as page from "../src/app/page.js";

const routes = await discoverRoutes("src/app");
const handler = createTestHandler({
  routes,
  modules: { "src/app/page.tsx": page },
});

describe("GET /", () => {
  it("returns 200 html", async () => {
    const res = await handler(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
```

## What is not covered

- Browser behavior (hydration, Fast Refresh, overlay) — see `docs/MANUAL_TESTS.md` for the manual checklist.
- Visual regression — no tooling in the repo.

## Related

- [Architecture](../architecture.md) · [MANUAL_TESTS](../MANUAL_TESTS.md)
