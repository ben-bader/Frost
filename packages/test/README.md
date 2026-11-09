# @frost.js/test

Test utilities for [Frost](https://github.com/ben-bader/Frost): run the real request pipeline against in-memory route modules — no filesystem, Vite, or browser required.

## Install

```bash
npm install -D @frost.js/test
```

## Example

```ts
import { describe, it, expect } from "vitest";
import { createTestHandler, callLoader } from "@frost.js/test";
import { discoverRoutes } from "@frost.js/router";
import * as page from "../src/app/page.js";

const handler = createTestHandler({
  routes: await discoverRoutes("src/app"),
  modules: { "src/app/page.tsx": page },
});

describe("GET /", () => {
  it("returns html", async () => {
    const res = await handler(new Request("http://localhost/"));
    expect(res.status).toBe(200);
  });
});
```

Also exports `renderRoute`, `callAction`, and `RenderRouteOptions`.

## Docs

[docs/api/test.md](https://github.com/ben-bader/Frost/blob/main/docs/api/test.md) · [Testing guide](https://github.com/ben-bader/Frost/blob/main/docs/guides/testing.md)
