# Performance

> What's already fast, the tuning knobs, and measured numbers with method.

**Last verified against v0.1.1.**

## What's already on

- **Parallel loaders** — page + layout loaders run concurrently.
- **Lazy server routes** — production chunks per route; startup cost doesn't grow linearly with route count.
- **Compression** — build pre-compresses assets (br + gzip); the Node adapter negotiates `Accept-Encoding`, skips bodies under `compression.threshold` (default 1024 B) and already-compressed types, and keeps per-encoding ETags/304s. `compression.{enabled,brotli,gzip,threshold}`.
- **Caching headers** — hashed assets get `immutable`; HTML gets `no-cache` (it embeds per-request state). Per-route `headers` export can override.
- **Modulepreload** — route entry + direct deps preloaded; known fonts get `<link rel="preload">`.
- **Dev caching** — route discovery and the CSS graph are cached, invalidated only by watcher add/unlink/change in app/api dirs.
- **Streaming SSR** — `renderToReadableStream` flushes the shell early (`ssr.streaming`, default on; `renderToString` fallback).
- **Budgets** — `budgets.clientJsKb` warns per route; `--strict` fails the build. `frost build --analyze` prints per-route/shared sizes raw + gzip.

## Tuning knobs

| Knob | Effect |
|---|---|
| `router.prefetch` | `intent` (hover/focus), `viewport`, or `none` — client router only |
| `contracts.validateInProduction` | keep `false` in prod hot paths unless contracts guard critical routes |
| `logging.requestLogs` | off by default; enable in dev for per-request lines |
| `compression.threshold` | raise to skip compressing small JSON/HTML |
| `dev.watch.usePolling` | slower but reliable on some filesystems |

## Measured numbers

Method: `node audit-output/bench.mjs http://localhost:<port>` against `frost start` serving the starter production build — 50 sequential + 5×10 concurrent `fetch` requests per route, timings via `performance.now()`. Machine: Windows desktop, Node v24.15.0, 2026-11-09, loopback only.

| Route | Seq p50 | Seq p95 | Conc p50 (10-wide) | Conc rps |
|---|---|---|---|---|
| `/` | 28.5 ms | 37.5 ms | 285 ms | ~33 |
| `/playground` | 21.8 ms | 38.4 ms | 178 ms | ~54 |

**Read this honestly:** loopback numbers on a single dev machine include connection setup and OS scheduling noise — concurrent figures are an upper bound, not a throughput guarantee. There is no cross-framework baseline; Frost has not been benchmarked against Next.js or others on the same app. Use these numbers to catch regressions in this repo (`bench.mjs` is deterministic enough for that), not to claim relative performance.

## Related

- [Rendering](../rendering.md) — streaming details · [Styling](styling.md) — CSS pipeline
