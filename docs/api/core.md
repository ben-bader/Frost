# @frost.js/core

> Shared types, config, contracts, errors, env loading, logging, and route definition. The base of every other package.

**Last verified against v0.1.1.** You rarely import this directly — everything re-exports through `@frost.js/vite`, `@frost.js/server`, or `@frost.js/data`.

## Install

```bash
npm install @frost.js/core
```

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `defineConfig(config)` | fn | Identity helper for `frost.config.ts` typing |
| `resolveConfig(config)` | fn | Merge user config over `defaultFrostConfig` |
| `FrostConfig`, `ResolvedFrostConfig` | types | Config surface (see [configuration](../reference/configuration.md)) |
| `FrostError` | class | Internal diagnostic error (`code: FS10xx`) |
| `FrostErrorReport`, `FrostErrorCode` | types | Error pipeline payloads |
| `FROST_ERROR_CODES` | const | The 12 `FROST_E_*` report codes |
| `formatErrorReportTerminal(report)` | fn | Terminal `ERROR` block text |
| `Route`, `RouteModule`, `RouteLoader`, `RouteAction`, `RouteMetadata`, `RouteHeaders`, `FrostMiddleware`, `ApiRouteModule` | types | Route contract types |
| `FrostRequestContext`, `createRequestContext` | type/fn | Per-request context |
| `defineRoute(...)` | fn | Typed route helper |
| `createContractError`, `validateContractValue`, `formatContractIssues`, `RouteContract` | fns/types | Contract validation |
| `json`, `redirect`, `html`, `htmlStream` | fns | Response helpers |
| `loadEnvFiles`, `missingEnvVars` | fns | `.env` loading + required-var check |
| `createLogger`, `logRequest`, `FrostLogger` | fns/types | Logging |
| `DEFAULT_CSP_POLICY` | const | Default CSP template with `{nonce}` placeholder |
| `createErrorReport`, `toPublicError` | fns | Build/sanitize `FrostErrorReport`s |
| `routeTypesDeclaration(routes)` | fn | Emit generated route `.d.ts` source |
| `validateClientEnvAccess`, `validateModuleBoundary` | fns | Client/server boundary checks |
| `parseJson`, `parseFormData`, `formDataToObject`, `searchParamsToObject` | fns | Body parsing helpers |
| `StandardSchemaV1`, `isStandardSchema` | types/fn | Standard Schema interop |

## Related

- [Configuration](../reference/configuration.md) · [Error codes](../reference/error-codes.md) · [API routes](../guides/api-routes.md)
