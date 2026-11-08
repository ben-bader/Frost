# Performance

## What's already on

- **Parallel loaders**: page + layout loaders run concurrently.
- **Lazy server routes**: production server chunks per route; startup
  cost doesn't grow linearly with route count.
- **Compression**: build pre-compresses assets (br + gzip); the Node
  adapter negotiates `Accept-Encoding`, skips <1 KB and already-
  compressed types, and keeps per-encoding ETags/304s.
  `compression.{enabled,brotli,gzip,threshold}`.
- **Caching**: hashed assets get `immutable`; HTML gets `no-cache`
  (embeds per-request state). Per-route `headers` export can override.
- **Modulepreload**: route entry + direct deps are preloaded; known
  fonts get `<link rel="preload">`.
- **Dev caching**: route discovery and the CSS graph are cached and
  invalidated only by watcher add/unlink/change in app/api dirs.
- **Streaming SSR**: `renderToReadableStream` flushes the shell early
  (`config.ssr.streaming`, default on; falls back to `renderToString`).
- **Budgets**: `budgets.clientJsKb` warns per route; `--strict` fails.
  `frost build --analyze` prints per-route/shared sizes raw + gzip.

## Tuning knobs

- `router.prefetch`: `intent` (hover/focus), `viewport`, or `none`.
- `contracts.validateInProduction`: keep `false` in prod hot paths.
- `logging.requestLogs`: off by default; enable in dev.
