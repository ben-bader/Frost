# 006 — Parallel client/server builds and lazy route modules

Context: `frost build` ran client then server sequentially and eagerly imported every route module into one 65KB server bundle (audit Phase 2).

Options: keep sequential eager build; parallel builds with runtime assets.json; lazy `import()` per route.

Decision: route modules are emitted as dynamic `import()` importers in `virtual:frost/routes` (real server code-splitting — only requested routes load). `server-entry.js` reads `assets.json` at runtime instead of bundling it, removing the build-time dependency, so client and server Vite builds run in `Promise.all`. Client entry shims live in `node_modules/.cache/frost` and are removed in `finally`.

Consequences: faster builds, smaller startup footprint; first hit per route pays one `import()`; Rollup still has no true incremental mode (deferred — see audit).
