# Deployment

> Node production serving, Docker, and the fetch adapter for edge/serverless runtimes.

**Last verified against v0.1.1.**

## Node (adapter-node)

```bash
npm run build     # emits .frost/{client,server}
npm run start     # or: node .frost/server/server-entry.js
```

`frost start` prints the real bound port (not just the configured one), fails clearly on `EADDRINUSE`, and serves pre-compressed assets directly. The adapter handles static files with path containment, compression negotiation, and per-encoding ETags.

Environment at runtime: `server.port`/`server.host` from `frost.config.ts`, `env.required` vars must be present or startup fails.

### Dockerfile

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", ".frost/server/server-entry.js"]
```

Adjust the install step to your package manager; the output contract is `.frost/server/server-entry.js`.

## Edge / serverless (fetch adapter)

`createFetchAdapter` from `@frost.js/server` wraps the same `createRequestHandler` options in a Web `Request → Response` handler:

```ts
import { createFetchAdapter } from "@frost.js/server";

export default createFetchAdapter({
  routes,
  loadModule,
  // ...same options as createRequestHandler
});
```

Drop it into a Cloudflare Worker, Vercel Edge Function, Deno, or Bun `fetch` export. Static assets and `.frost` HTML are host concerns there — serve `public/` through your platform's asset layer.

`createNodeServer` from `@frost.js/adapter-node` is the lower-level `node:http` server if you need a custom listener.

## Health checks

The Node adapter answers `GET /healthz` with `{"status":"healthy","timestamp":…}` before static or route handling — no setup needed. On the fetch adapter there is no built-in health route; add one as an API route:

```ts
// src/api/health/route.ts
export function GET() {
  return Response.json({ ok: true });
}
```

## Production checklist

- `security.cspMode: "enforce"` + `security.hsts: true` behind TLS.
- `contracts.validateInProduction: true` if contracts guard money/auth paths.
- `env.required` for secrets that must exist at boot.
- `logging.format: "json"` for log aggregation; `logging.level` per environment.
- `seo.baseUrl` + `sitemap`/`robots` for crawlers.

## Common mistakes

- **Serving `src/` instead of `.frost/`** — production output lives in `.frost/`; `npm start` knows this, custom servers must too.
- **Expecting edge adapters to serve static files** — the fetch adapter handles dynamic requests only; host your `public/` assets separately.
- **Missing `env.required`** — failures surface late; declare required vars so boot fails fast.

## Related

- [CLI](../reference/cli.md) · [Security](security.md) · [Environment](environment-variables.md)
