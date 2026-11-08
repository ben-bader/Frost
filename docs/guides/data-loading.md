# Data loading

## Loaders

A page or layout module may export `loader`:

```ts
export const loader = async ({ request, params, url, context }) => {
  return { title: "Hello" };
};
```

- Page and all ancestor layout loaders run **in parallel**; each layout
  receives its own loader result as its `data` prop, aligned root→leaf.
- Loader data is serialized into the HTML (`__FROST_DATA__`) and
  available during hydration — no client fetch waterfall.
- Loader errors render the nearest `error.tsx` boundary with
  `FROST_E_LOADER` reported to `onError`/the dev overlay.

## Actions

`action` handles `POST` to the page URL:

```ts
export const action = async ({ request, params, context }) => {
  const form = await request.formData();
  return { saved: true };
};
```

- Plain `<form method="post">` works without JavaScript (progressive
  enhancement); the response re-renders the page with `actionData`.
- With JS, same-origin POST forms are upgraded to `fetch` automatically.
- CSRF is validated on POSTs; body size is capped by
  `limits.formBytes` (default 1 MB).

## Server functions (RPC)

`createServerFn` in `@frostjs/server` exposes a typed function over
`POST /_frost/fn/<id>` with origin/CSRF checks. The Vite plugin rewrites
client imports into fetch stubs; see the package source for the
serialization contract.
