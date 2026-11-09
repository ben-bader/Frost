# @frost.js/adapter-node

> Node `http` server: static files, compression, `/healthz`, graceful shutdown.

**Last verified against v0.1.1.**

## Install

```bash
npm install @frost.js/adapter-node
```

`frost start` uses this automatically — you only need it for custom servers.

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `createNodeServer(options)` | fn | `node:http` server wrapping `handleRequest` |
| `NodeServerOptions` | type | `port`, `host`, `staticDirs`, `handleRequest`, `compression` |
| `tryServeStaticFile(req, res, options)` | fn | Serve files from `staticDirs` with cache headers |
| `StaticServerOptions` | type | Static serving options |
| `nodeReqToWebRequest`, `sendWebResponseToNode`, `isSafeRequestTarget` | fns | Node↔Web bridging |
| `compressBuffer`, `decompressBuffer`, `negotiateEncoding`, `etagForEncoding`, `isCompressible`, `toCompressionOptions`, `CompressionOptions`, `ContentEncoding` | fns/types | Compression layer |
| `getMimeType` | fn | MIME lookup |
| `resolveStaticPath(dir, pathname)` | fn | Safe static path resolution (containment) |

## Behavior

- `GET /healthz` → `{"status":"healthy","timestamp":…}` before anything else.
- Static files served before the request handler (middleware does not run for them); hashed assets get `immutable` caching.
- Compression negotiated per `Accept-Encoding`; respects `compression.threshold`.
- `SIGINT`/`SIGTERM` close the server gracefully.

## Related

- [Deployment](../guides/deployment.md) · [Security](../guides/security.md) (static containment)
