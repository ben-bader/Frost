# 005 — Body size limits

Context: `parseFormData`/`parseJson` trusted `content-length` and buffered unbounded bodies (audit F22).

Options: rely on content-length; read-then-check; stream-count while reading.

Decision: both parsers now read `request.body` chunk-by-chunk, aborting with a 413 `FrostError` (`FS1011`) the moment cumulative bytes exceed the limit, then re-parse from the buffered bytes. Defaults come from `limits.formBytes`/`limits.jsonBytes` (1 MiB each), applied via `setBodyLimits()` called by the Vite plugin and the generated production server entry; per-call `maxSizeBytes` still wins.

Consequences: chunked/no-content-length uploads are capped too; bodies up to the limit are buffered once (same as before); the module-level setter is explicit setup, not hidden magic.
