# Rendering

> How Frost renders pages: SSR, streaming, hydration, and how to avoid hydration mismatches.

**Last verified against v0.1.1.**

## Server-side rendering

Every page route is rendered on the server for each request. There is no static-generation mode in 0.1.x — SSG/ISR is planned (see [roadmap](project/roadmap.md)). Layout loaders, the page loader, and metadata resolution all run in parallel before render.

The rendered document includes:

- The full HTML for the route (layouts + page).
- A serialized client state payload (`__FROST_DATA__`) containing loader data and route identity.
- `<link rel="stylesheet">` tags resolved from the route's CSS graph — in the initial HTML, before first paint.
- Modulepreload hints for the route's client entry and direct dependencies; font preloads for known font files.

## Streaming

`ssr.streaming` (default `true`) renders with React's `renderToReadableStream`: the document shell flushes early and Suspense boundaries stream in as they resolve. Set `ssr.streaming: false` to fall back to `renderToString` (single buffered response).

The Node adapter streams response bodies through the compressor, so early chunks reach the client before the full body is generated.

## Hydration

After the HTML arrives, the client bundle reconnects to the serialized state — it does not re-run loaders or re-fetch data. `hydrateApp` in `@frost.js/react` mounts the same component tree with the server-provided `data`, `params`, and layout data.

Components that use browser-only APIs (`useState`, `useEffect`, `window`, etc.) hydrate normally — the starter's `/playground` counter renders `0` on the server and becomes interactive on the client.

## Determinism and hydration mismatches

Hydration mismatches happen when server and client render different markup. Common causes in Frost:

- `Date.now()`, `Math.random()`, locale formatting, or `new Date()` inside render — values differ between server render and client hydrate.
- Reading `window`/`document`/`localStorage` during render instead of in `useEffect`.
- Non-deterministic loader data that changes between the SSR pass and hydration.

Enable the built-in check in dev:

```ts
// frost.config.ts
export default defineConfig({
  dev: { checkDeterminism: true },
});
```

Each route then renders twice per request; a diff produces a `WARN` report (`FROST_E_HYDRATION`) naming the route and first differing output line. See [dev server](guides/dev-server.md).

## Error rendering

- Loader/action errors render the nearest `error.tsx` boundary inside the layout chain.
- Missing routes render `not-found.tsx` (or a minimal styled document) with status 404.
- In production, error details are reduced by `toPublicError` — name, message, code, route only; no filesystem paths or stacks.

## Related

- [Data loading](guides/data-loading.md) — where loader data comes from
- [Error handling](guides/error-handling.md) — boundaries and error codes
- [Performance](guides/performance.md) — streaming + compression details
