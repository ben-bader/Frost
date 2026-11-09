# Configuration

> Every option in `frost.config.ts`, verified against `packages/core/src/config.ts`.

**Last verified against v0.1.1.**

`frost.config.ts` exports `defineConfig({...})` from `@frost.js/vite` (or `@frost.js/core`). All fields are optional; unset values use the defaults below.

## Top level

| Option | Type | Default | Description |
|---|---|---|---|
| `app.name` | `string` | `"Frost"` | Site name used in default metadata/OG |
| `app.lang` | `string` | `"en"` | `<html lang>` |
| `appDirectory` | `string` | `"src/app"` | Pages, layouts, middleware, not-found |
| `apiDirectory` | `string` | `"src/api"` | API routes |
| `publicDirectory` | `string` | `"public"` | Static assets |

## Directories & build

| Option | Type | Default | Description |
|---|---|---|---|
| `server.port` | `number` | `3000` | Dev and prod port |
| `server.host` | `string` | `"localhost"` | Bind host |
| `build.outDir` | `string` | `".frost"` | Build output root |
| `build.sourcemap` | `boolean` | `true` | Emit sourcemaps |
| `cache.default` | `"no-store" \| "memory"` | `"no-store"` | Default loader cache mode |
| `cache.maxMemoryEntries` | `number` | `1000` | Memory cache bound |

## security

| Option | Type | Default | Description |
|---|---|---|---|
| `security.csp` | `string \| false` | default policy | CSP string (`{nonce}` placeholder) or `false` |
| `security.cspMode` | `"report-only" \| "enforce"` | `"report-only"` | Header variant |
| `security.hsts` | `boolean \| {maxAge?, includeSubDomains?, preload?}` | `false` | Strict-Transport-Security |
| `security.permissionsPolicy` | `string \| false \| Record<string,string>` | `camera=(), microphone=(), geolocation=()` | Permissions-Policy |

## dev

| Option | Type | Default | Description |
|---|---|---|---|
| `dev.watch.usePolling` | `boolean` | `false` | Poll instead of native fs events |
| `dev.watch.interval` | `number` | `100` | Poll interval (ms) |
| `dev.checkDeterminism` | `boolean` | `false` | Render twice per request, warn on mismatch |
| `dev.overlay` | `boolean` | `true` | Browser error overlay |

## compression

| Option | Type | Default | Description |
|---|---|---|---|
| `compression.enabled` | `boolean` | `true` | Response compression |
| `compression.brotli` | `boolean` | `true` | br support |
| `compression.gzip` | `boolean` | `true` | gzip support |
| `compression.threshold` | `number` | `1024` | Min bytes to compress |

## Other sections

| Option | Type | Default | Description |
|---|---|---|---|
| `budgets.clientJsKb` | `number` | — | Warn when a route's client JS exceeds this |
| `budgets.strict` | `boolean` | `false` | Fail build on budget excess |
| `contracts.validateInProduction` | `boolean` | `false` | Validate contracts in prod too |
| `router.enabled` | `boolean` | `false` | Opt-in client router |
| `router.prefetch` | `"intent" \| "viewport" \| "none"` | `"intent"` | Client-router prefetch trigger |
| `ssr.streaming` | `boolean` | `true` | Stream with Suspense support |
| `logging.level` | `"debug" \| "info" \| "warn" \| "error"` | `"info"` | Log level |
| `logging.requestLogs` | `boolean` | `false` | One line per request |
| `logging.format` | `"pretty" \| "json"` | `"pretty"` | Log format |
| `env.required` | `string[]` | `[]` | Vars that must exist at startup |
| `env.publicPrefix` | `string` | `"FROST_PUBLIC_"` | Client-visible env prefix |
| `seo.sitemap` | `boolean` | `false` | Generate `sitemap.xml` at build |
| `seo.robots` | `boolean` | `false` | Generate `robots.txt` at build |
| `seo.baseUrl` | `string` | — | Absolute origin for generated URLs |
| `serverFns.path` | `string` | `"/_frost/fn"` | Server-function RPC endpoint prefix |
| `limits.formBytes` | `number` | `1048576` (1 MiB) | Max form body bytes |
| `limits.jsonBytes` | `number` | `1048576` (1 MiB) | Max JSON body bytes |

## Example

```ts
import { defineConfig } from "@frost.js/vite";

export default defineConfig({
  app: { name: "My App" },
  server: { port: 4000 },
  security: { cspMode: "enforce", hsts: true },
  env: { required: ["DATABASE_URL"] },
  seo: { sitemap: true, robots: true, baseUrl: "https://example.com" },
});
```

## Related

- [Security](../guides/security.md) · [Environment](../guides/environment-variables.md) · [CLI](cli.md)
