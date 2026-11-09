# API routes

> REST-style endpoints under `src/api`, mapped to `/api/**`.

**Last verified against v0.1.1.**

## Conventions

API route files live under `apiDirectory` (default `src/api`). The file path maps to the URL:

| File | Endpoint |
|---|---|
| `src/api/hello/route.ts` | `/api/hello` |
| `src/api/users/[id]/route.ts` | `/api/users/:id` |

An API module exports verb handlers — each receives `(request, context)` and returns a `Response`:

```ts
// src/api/hello/route.ts
export function GET() {
  return Response.json({ hello: "world" });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ received: body }, { status: 201 });
}
```

Supported verbs: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`. `OPTIONS`/`HEAD` are handled automatically unless you export your own.

## Context and helpers

`context` is the `FrostRequestContext` — it carries `requestId`, `startTime`, `memo` (for `dedupe`), optional `clientIp`/`userAgent`, and `cspNonce` when CSP is enabled. Response helpers from `@frost.js/server`:

```ts
import { json, redirect, html } from "@frost.js/server";

export function GET() {
  return json({ ok: true });
}
```

- `json(data, init?)` — JSON response with content-type.
- `redirect(url, status = 302)` — redirect response.
- `html(content, init?)` / `htmlStream(stream, init?)` — HTML responses.

## Contracts and middleware

API modules support `contract` (`params`, `search`) for input validation — failures return 400 `FROST_E_CONTRACT`. App middleware (`app/_middleware.ts`) runs before API routes too, so auth guards belong there.

## Body limits

JSON and form bodies are capped by `limits.jsonBytes`/`limits.formBytes` (default 1 MiB) — oversized bodies get 413 `FROST_E_BODY`. Parse with `parseJson`/`parseFormData` from `@frost.js/data`, which enforce the same limits.

## Common mistakes

- **Putting APIs under `src/app`** — `src/app/api/...` becomes a *page* route, not an endpoint. Use `src/api/`.
- **Returning plain objects** — handlers must return `Response` (or use the helpers).
- **Reading `request.json()` twice** — the body stream is single-use; parse once.

## Related

- [Routing](routing.md) · [Security](security.md) · [Server functions](data-loading.md#server-functions-rpc)
