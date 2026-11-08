# Error handling

## Error boundaries

- `app/error.tsx` (or `_error.tsx`) in any directory is the nearest
  boundary for pages below it; it renders **inside** the layout chain
  and receives `{ error, data, params }`.
- `app/not-found.tsx` (or `_404.tsx`, app root only) renders 404s inside
  the root layout with status 404.
- Unmatched paths without a not-found file get a minimal styled
  `FrostDocument` — never a bare text response.

## Error codes

Stable codes live in `@frost.js/core` (`FROST_ERROR_CODES`) and are
attached to every `FrostErrorReport`:

`FROST_E_LOADER`, `FROST_E_ACTION`, `FROST_E_RENDER`, `FROST_E_API`,
`FROST_E_CONTRACT`, `FROST_E_HYDRATION`, `FROST_E_CONFIG`,
`FROST_E_BOUNDARY`, `FROST_E_BODY`, `FROST_E_MIDDLEWARE`, `FROST_E_ENV`,
`FROST_E_SERVERFN`.

An explicit `FROST_E_*` code on the thrown error wins over inferred
categories; Vite `ERR_*` codes are only used when no Frost category
applies.

## Dev overlay

In dev, server render/loader/API/middleware errors produce a styled
overlay (role="alertdialog") **and** a terminal `ERROR` block from the
same `FrostErrorReport`: name, message, code, file:line:column (source-
mapped), 5-line code frame, collapsible stack, route, runtime
(server/client), timestamp. It clears on the next successful render.
`frost:error`/`frost:error-clear` travel over the Vite WS channel — see
`decisions/009-dev-reload-protocol.md`.

## Determinism check

`dev.checkDeterminism: true` renders each route twice in dev and warns
(with diff location) on mismatch — typical culprits: `Date.now()`,
`Math.random()`, locale formatting.
