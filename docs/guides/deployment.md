# Deployment

## Node (adapter-node)

```bash
pnpm build          # emits .frost/{client,server}
frost start         # or: node .frost/server/server-entry.js
```

`frost start` prints the real bound port, handles `EADDRINUSE` with a
clear message, and serves pre-compressed assets directly.

Docker example:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build
EXPOSE 3000
CMD ["pnpm", "--dir", "examples/starter", "start"]
```

## Edge / serverless (fetch adapter)

`createFetchAdapter` from `@frostjs/server` wraps the same
`createRequestHandler` options in a Web `Request → Response` handler —
drop it into a Cloudflare Worker / Vercel Edge / Deno / Bun `fetch`
export. Static assets and `.frost` HTML are host concerns there; serve
`public/` through your platform's asset layer.

## Config checklist

- `security.cspMode: "enforce"` + HSTS behind TLS.
- `contracts.validateInProduction: true` if contracts guard money paths.
- `env.required` for secrets that must exist at boot.
- `logging.format: "json"` for log aggregation.
