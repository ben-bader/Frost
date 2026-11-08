# ADR 0004: Platform Independence and Node.js Production Adapter Contract

## Status
Accepted

## Context
Frameworks that tie themselves tightly to proprietary cloud runtimes create vendor lock-in, complicate self-hosting, and produce subtle discrepancies between local testing and production behavior.

## Decision
1. **Core Runtime Independence:**
   - The core request handler (`@frost.js/server`) operates on web standard request/response primitives (`Request`, `Response`, `Headers`).
   - Does not assume proprietary cloud headers, proprietary cache storage, or proprietary file system layouts.
2. **First-Class Node.js Adapter (`@frost.js/adapter-node`):**
   - Implements a production-ready HTTP/HTTPS server using Node.js built-in `node:http`.
   - Bridges Node.js `IncomingMessage` and `ServerResponse` to standard Web API `Request` and `Response`.
   - Handles static asset delivery with proper `Content-Type`, `ETag`, and `Cache-Control` headers.
   - Provides graceful shutdown (`SIGTERM`, `SIGINT`), active connection draining, and `/healthz` endpoints.
3. **Production Manifest Contract:**
   - Every build emits a deterministic manifest (`.frost/manifest.json`) detailing client entrypoints, chunk files, CSS assets, route mapping, and asset hashes. The server adapter operates exclusively through this manifest.

## Consequences
- **Positive:**
  - Can run anywhere Node.js runs: Docker containers, VPS, Kubernetes, bare metal, or cloud VMs.
  - Development and production parity: local `frost preview` runs the exact same Node.js adapter as production.
- **Negative:**
  - Adapters for Edge/Cloudflare Workers or AWS Lambda will be delivered as separate standalone packages following this exact same contract in subsequent phases.

