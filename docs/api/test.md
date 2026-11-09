# @frost.js/test

> Test utilities — in-memory route handlers without a filesystem or browser.

**Last verified against v0.1.1.**

## Install

```bash
npm install -D @frost.js/test
```

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `createTestHandler(options)` | fn | `(Request) => Promise<Response>` backed by in-memory modules |
| `TestHandlerOptions` | type | `routes`, `modules` (keyed by `filePath` or `id`), plus `RequestHandlerOptions` |
| `renderRoute(routeModule, options?)` | fn | Render a page module → HTML `Response` (loaders run) |
| `callLoader(routeModule, options?)` | fn | Invoke `loader` with a mock request |
| `callAction(routeModule, options?)` | fn | Invoke `action` (POST by default) |
| `RenderRouteOptions` | type | `request`, `params`, `context`, `pathname` |

## Example

```ts
import { createTestHandler } from "@frost.js/test";
import { discoverRoutes } from "@frost.js/router";
import * as page from "../src/app/page.js";

const handler = createTestHandler({
  routes: await discoverRoutes("src/app"),
  modules: { "src/app/page.tsx": page },
});

const res = await handler(new Request("http://localhost/"));
```

## Related

- [Testing](../guides/testing.md) · [API: server](server.md)
