# Error handling

> Error boundaries, the stable `FROST_E_*` code table, dev overlay, and terminal output.

**Last verified against v0.1.1.**

## Error boundaries

- `app/error.tsx` (or `_error.tsx`) in any directory is the nearest boundary for pages below it. It renders **inside** the layout chain and receives `{ error, data, params }`.
- `app/not-found.tsx` (or `_404.tsx`, app root only) renders 404s inside the root layout with status 404.
- Unmatched paths without a not-found file get a minimal styled `FrostDocument` — never a bare text response.

```tsx
// app/error.tsx
export default function Error({ error }: { error: Error }) {
  return <div>Something went wrong: {error.message}</div>;
}
```

React error boundaries catch **render** errors only — not event handlers or async errors. Loader/action/middleware/API errors are handled by the server pipeline before render.

## Error codes

Every `FrostErrorReport` carries a stable code from `@frost.js/core` (`FROST_ERROR_CODES`). An explicit `FROST_E_*` code on a thrown error wins over the inferred category; Vite `ERR_*` codes are only a fallback.

| Code | Category |
|---|---|
| `FROST_E_LOADER` | Loader threw or returned invalid data |
| `FROST_E_ACTION` | Action threw |
| `FROST_E_RENDER` | Component render threw |
| `FROST_E_API` | API route handler threw |
| `FROST_E_CONTRACT` | Contract validation failed |
| `FROST_E_HYDRATION` | Hydration/determinism problem |
| `FROST_E_CONFIG` | Config file failed to load/resolve |
| `FROST_E_BOUNDARY` | Client/server boundary violation |
| `FROST_E_BODY` | Body parse failed or exceeded limit |
| `FROST_E_MIDDLEWARE` | Middleware threw |
| `FROST_E_ENV` | Missing required env var |
| `FROST_E_SERVERFN` | Server-function transport error |

See [error codes reference](../reference/error-codes.md) for the full table and HTTP mappings.

## Dev overlay

In dev, server render/loader/API/middleware errors produce a styled overlay (`role="alertdialog"`, danger border, error name/message, source location, code frame, meta grid, suggested hint, Copy details + Dismiss) **and** a terminal `ERROR` block from the same `FrostErrorReport`. The overlay clears on the next successful render; Escape/backdrop closes it.

`frost:error`/`frost:error-clear` travel over the Vite WS channel — see `docs/decisions/009-dev-reload-protocol.md`.

## Production behavior

`toPublicError` strips stack/frame detail — clients get name, message, code, route, runtime, timestamp only. No filesystem paths or internals leak.

## Determinism check

`dev.checkDeterminism: true` renders each route twice in dev and warns (`FROST_E_HYDRATION`, severity warning → orange `WARN` badge) on mismatch — typical culprits: `Date.now()`, `Math.random()`, locale formatting. See [rendering](../rendering.md).

## Throwing your own errors

Throw ordinary `Error`s — the pipeline categorizes them into the nearest `FROST_E_*` code (`FROST_E_LOADER` inside a loader, `FROST_E_ACTION` inside an action, and so on). To pin an explicit category, set a `code` property on the error before throwing:

```ts
const err = new Error("Payment required") as Error & { code: string };
err.code = "FROST_E_ACTION";
throw err;
```

`FrostError` (FS10xx codes) exists for framework-internal diagnostics — it is not the user-facing error type.

## Related

- [Error codes reference](../reference/error-codes.md) · [Dev server](dev-server.md)
