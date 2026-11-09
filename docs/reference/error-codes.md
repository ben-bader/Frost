# Error codes

> Every `FROST_E_*` report code, where it's raised, and what it means. Source: `packages/core/src/diagnostics.ts`.

**Last verified against v0.1.1.**

Error reports (`FrostErrorReport`) carry a stable `code`. These strings are part of the public contract — tooling and tests may match on them.

| Code | Raised when |
|---|---|
| `FROST_E_LOADER` | A route `loader` throws |
| `FROST_E_ACTION` | A route `action` throws |
| `FROST_E_RENDER` | SSR render throws (component/renderToString failure) |
| `FROST_E_API` | An API route handler throws |
| `FROST_E_CONTRACT` | Route contract validation fails (params/search/body) |
| `FROST_E_HYDRATION` | Determinism check finds nondeterministic render output (dev) |
| `FROST_E_CONFIG` | `frost.config.*` fails to load/resolve |
| `FROST_E_BOUNDARY` | Server-only module or env var reachable from client code |
| `FROST_E_BODY` | Request body exceeds `limits.formBytes`/`limits.jsonBytes` (413) |
| `FROST_E_MIDDLEWARE` | `app/_middleware.ts` throws |
| `FROST_E_ENV` | A required env var is missing at startup |
| `FROST_E_SERVERFN` | A `createServerFn` call fails validation or transport |

## Related codes (not `FROST_E_*`)

- **`FS1001`–`FS1011`** — `FrostError.code` values for framework-internal diagnostics (route conflicts, invalid exports, not-found, method-not-allowed, static-export failure, hydration mismatch flag, contract violation, body-too-large). See `packages/core/src/errors.ts`.
- **`404`/`405`/`413`/`500`** — HTTP statuses surface through responses, not report codes.

## Where codes appear

- Terminal `ERROR` block: `code: FROST_E_LOADER`
- Browser overlay meta grid
- JSON error responses in dev (`{"error": {"code": …}}` shape via `FrostErrorReport`)
- `onError` handler payloads in tests and custom servers

## Related

- [Error handling](../guides/error-handling.md) — full pipeline
