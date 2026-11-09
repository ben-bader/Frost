# @frost.js/server

> Request handling, SSR, security headers, API dispatch, server functions, and the fetch adapter.

**Last verified against v0.1.1.**

## Install

```bash
npm install @frost.js/server
```

Used by `@frost.js/adapter-node`, `@frost.js/test`, and custom servers. Most apps only touch it for `createFetchAdapter` on edge runtimes.

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `createRequestHandler(options)` | fn | Build `(Request) => Promise<Response>` — the whole pipeline |
| `RequestHandlerOptions` | type | routes, loadModule, config, onError, logger options |
| `createFetchAdapter(options)` | fn | Web-standard `fetch` handler for edge/serverless |
| `FrostAdapter` | type | Adapter interface |
| `renderRouteToHtml(...)` | fn | SSR a route module to HTML |
| `dispatchApiRoute(...)` | fn | Run an API route module |
| `dispatchServerFn(...)`, `ServerFnDispatchOptions` | fn/type | Server-function RPC endpoint |
| `createErrorReport`, `toPublicError`, `formatErrorReportTerminal` | fns | Error pipeline |
| `applySecurityHeaders`, `SecurityHeadersOptions` | fn/type | CSP/HSTS/Permissions-Policy |
| `json`, `redirect`, `html`, `htmlStream` | fns | Response helpers (re-exported from core) |
| `setBodyLimits`, `getBodyLimits`, `parseJson`, `parseFormData` | fns | Body parsing + limits |
| `dedupe` | fn | Request-scoped memoization |
| `runRouteLoaders` | fn | Execute loader chain for a matched route |
| `renderSimpleDocument` | fn | Minimal HTML document for errors/404 fallback |

## Notes

- `createRequestHandler` is what both the Node adapter and `createTestHandler` call — middleware → match → loaders → render.
- `createFetchAdapter` returns a `fetch`-compatible handler; static assets are your host's job.

## Related

- [Architecture](../architecture.md) · [Deployment](../guides/deployment.md) · [Testing](../guides/testing.md)
