# @frost.js/vite

> The Vite plugin — dev server, HMR, boundary transform, CSS graph, build pipeline.

**Last verified against v0.1.1.**

## Install

```bash
npm install @frost.js/vite
```

Every app uses it via `frost.config.ts` + the `frost` CLI; direct import is for custom Vite setups.

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `frost` (default + named) | plugin | The Vite plugin factory |
| `FrostPluginOptions` | type | Plugin options |
| `defineConfig`, `resolveConfig`, `FrostConfig`, `ResolvedFrostConfig` | re-exports | Config helpers from core |
| `Route`, `RouteModule`, `ApiRouteModule`, `FrostError` | re-exports | Core types |
| `validateModuleBoundary`, `validateClientEnvAccess` | fns | Build-time boundary/env checks |
| `generateRoutesModuleCode`, `routeTypesDeclaration` re-exports via router | fns | Virtual route modules + types |
| `generateClientEntryCode`, `transformServerFnCalls`, `serverFnClientCode` | fns | Virtual client/server-fn module codegen |
| `frostServerFnFetch` | fn | Client transport for server functions |
| `VIRTUAL_ROUTES_ID`, `RESOLVED_VIRTUAL_ROUTES_ID`, `VIRTUAL_CLIENT_ENTRY_ID`, `RESOLVED_VIRTUAL_CLIENT_ENTRY_ID`, `SERVER_FN_CLIENT_ID`, `RESOLVED_SERVER_FN_CLIENT_ID`, `DEV_CLIENT_ID`, `RESOLVED_DEV_CLIENT_ID`, `DEV_CLIENT_CODE`, `serverFnClientCode` | consts/fns | Virtual module IDs + generated client code |
| `routeImporters`, `routes` | consts | Virtual module source tables |

## What it does

- **Dev:** file watching → `frost:*` reload protocol, error overlay injection, per-route CSS serving, Fast Refresh, config restart.
- **Boundary transform:** enforces server/client module rules at build time (`FROST_E_BOUNDARY`).
- **Build:** client bundles per route + shared chunks, SSR bundle, asset manifest, precompressed assets, sitemap/robots.
- **Env:** injects `FROST_PUBLIC_*` vars, validates `env.required`.

## Related

- [Dev server](../guides/dev-server.md) · [Styling](../guides/styling.md) · [Architecture](../architecture.md)
