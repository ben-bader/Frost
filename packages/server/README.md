# @frost.js/server

The Frost request pipeline for [Frost](https://github.com/ben-bader/Frost): `createRequestHandler`, streaming SSR, security headers, API dispatch, and `createFetchAdapter` for edge runtimes.

Used by `@frost.js/adapter-node` and `@frost.js/test`. Import directly to build a custom server or a fetch-style handler for Cloudflare Workers, Deno, Bun, or serverless platforms.

## Install

```bash
npm install @frost.js/server
```

## Example

```ts
import { createFetchAdapter } from "@frost.js/server";

export default createFetchAdapter({
  routes,
  loadModule,
  // ...RequestHandlerOptions
});
```

## Docs

[docs/api/server.md](https://github.com/ben-bader/Frost/blob/main/docs/api/server.md) · [Deployment](https://github.com/ben-bader/Frost/blob/main/docs/guides/deployment.md)
