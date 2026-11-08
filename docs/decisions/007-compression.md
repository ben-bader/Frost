# 007 — Response compression

Context: no compression anywhere (audit F21); the shared JS chunk is 242KB raw / 75KB gzip.

Options: on-the-fly only; precompressed files only; both.

Decision: both. `frost build` writes `.br` (quality 11) and `.gz` (level 9) next to compressible client assets; the adapter serves them directly with `Content-Encoding` and per-encoding ETags. Dynamic HTML/JSON responses are compressed per request with `node:zlib` (br preferred, gzip fallback, quality tuned for latency). Config: `compression.{enabled,brotli,gzip,threshold}` (default on, 1KB threshold). `Vary: Accept-Encoding` is always set on compressible responses.

Consequences: ~73% smaller asset transfer; dynamic responses pay ~1ms compression CPU per request (measured +1ms p50 on localhost — acceptable vs. network savings); dynamic bodies are buffered rather than streamed when compression is enabled.
