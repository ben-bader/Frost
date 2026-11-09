# Data loading

> Loaders, parallel execution, request memoization, actions, forms, and server functions.

**Last verified against v0.1.1.**

## Loaders

A page or layout module may export `loader`:

```ts
export const loader = async ({ request, params, url, context }) => {
  return { title: "Hello" };
};
```

- Page and **all ancestor layout loaders run in parallel** (`Promise.all` in the handler). Each layout receives its own loader result as its `data` prop, aligned root→leaf — a layout never sees the page's data.
- Loader data is serialized into the HTML (`__FROST_DATA__`) and available during hydration — no client fetch waterfall.
- A loader may return a `Response` (e.g. `redirect()`, `json()`) to short-circuit rendering.
- Loader errors render the nearest `error.tsx` boundary and are reported as `FROST_E_LOADER`.

## Request memoization

`dedupe(context, key, factory)` from `@frost.js/data` runs an async operation once per request:

```ts
import { dedupe } from "@frost.js/data";

const user = await dedupe(context, "user:42", () => db.user.find(42));
```

The first call stores the in-flight promise; concurrent callers share it; failures are evicted so retries work. The memo lives on `FrostRequestContext` and dies with the request.

## Actions

`action` handles `POST` to the page URL:

```ts
export const action = async ({ request, params, context }) => {
  const form = await request.formData();
  return { saved: true };
};
```

- Plain `<form method="post">` works without JavaScript — the response re-renders the page with `actionData` in props.
- With JS, same-origin POST forms are upgraded to `fetch` automatically.
- CSRF origin is validated on every POST; bodies are capped by `limits.formBytes`/`limits.jsonBytes` (default 1 MiB each → 413).
- Action results are available as `actionData` on the re-rendered route component.

## Server functions (RPC)

`createServerFn` exposes a typed function over HTTP:

```ts
import { createServerFn } from "@frost.js/data";

export const getStats = createServerFn<{ range: string }, { count: number }>({
  name: "app.getStats",
  handler: async ({ range }) => ({ count: await db.count(range) }),
  validateInput: (raw) => ({ range: String((raw as any)?.range ?? "7d") }),
});
```

- On the server, call it directly: `await getStats({ range: "7d" })`.
- In client code the Vite plugin rewrites the call into a `fetch` to `POST {serverFns.path}/app.getStats` (default `/_frost/fn`).
- The transport checks origin/CSRF, runs `validateInput` (failures → 400 `FROST_E_CONTRACT`), and returns `{ result }` or a typed error (`FROST_E_SERVERFN`) without stack traces.
- `requireCsrf` on the config enforces CSRF validation when a request context is present.

See `packages/data/src/server-fn.ts` for `ServerFnConfig` options.

## Caching

Frost does not cache loader data implicitly. Control freshness with:

- `headers` export on the route (e.g. `Cache-Control`).
- `dedupe` for per-request memoization only.
- Your own store/CDN in front of the Node server.

## Common mistakes

- **Fetching in the component** — components render on the server too; use `loader` for data so it serializes into hydration.
- **Mutating module-level state in loaders** — loaders run per request; keep state in `context.memo` via `dedupe` or external stores.
- **Returning non-serializable loader data** — loader results cross the server→client boundary; use JSON-safe values.

## Related

- [Routing](routing.md) · [Contracts & types](contracts-and-types.md) · [Security](security.md)
