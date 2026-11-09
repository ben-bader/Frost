# Concepts

> The mental model behind Frost: explicit execution, visible data flow, and enforced runtime boundaries.

**Last verified against v0.1.1.**

## Explicit execution

Every module in a Frost app runs in exactly one place, and the framework never moves code across that line silently:

- **Server modules** — loaders, actions, API routes, server functions, middleware — run only on the server. They can read secrets, touch databases, and use Node APIs.
- **Client modules** — components using `useState`, `useEffect`, or browser APIs — are bundled for the browser and hydrated after the HTML arrives.
- **Shared modules** — pure data and types — can be imported by both.

You declare intent with file location and exports, not with directives you have to remember. The Vite plugin enforces the boundary at build time: a client-reachable module that reads `process.env.SOMETHING_SECRET` fails the build with `FROST_E_BOUNDARY`.

## Visible data flow

A page's data comes from its `loader` export — a named function you can read, test, and call directly:

```ts
export const loader = async ({ params, request }) => {
  return { name: params.name };
};
```

Loader results are serialized into the HTML and handed to the component during hydration. There is no client-side refetch waterfall on first load, and no hidden request cache to reason about.

Mutations go through `action` exports on the same route module, or through `createServerFn` RPC functions. Both validate CSRF origin on POST.

## The request lifecycle

One request moves through fixed phases, in order:

1. **Middleware** (`app/_middleware.ts`) — runs before routing; can short-circuit or post-process.
2. **Route match** — filesystem discovery + matcher produce the route and its params.
3. **Loaders** — page loader and every ancestor layout loader run in parallel.
4. **Metadata + render** — metadata resolves (also in parallel), the component tree renders, streaming when enabled.
5. **HTML + hydration payload** — the document ships with serialized loader data.
6. **Hydrate** — the client reconnects to that payload; no server code re-runs.

See the [architecture page](architecture.md) for the package-level view.

## Vocabulary

Consistent terms used across all docs:

| Term | Meaning |
|---|---|
| **route module** | A `page.tsx`/`layout.tsx` file and its exports (`loader`, `action`, `metadata`, `contract`, `headers`) |
| **app middleware** | `app/_middleware.ts` (or `middleware.ts`) at the app root |
| **loader** | Server function that produces a route's data before render |
| **action** | Server function that handles POST to the route URL |
| **contract** | Runtime validation spec (Standard Schema) for params/search/loader/action |
| **server function** | `createServerFn` RPC callable from client code over `/_frost/fn` |
| **hydration** | Client-side reconnection to server-rendered HTML and data |
| **boundary** | The enforced server/client module split |
| **error report** | `FrostErrorReport` — one structured object behind the overlay and terminal output |

## What Frost is not

- Not a React replacement — it is ordinary React SSR + hydration.
- Not a hosted platform — you own the deploy target (Node or any fetch runtime).
- Not implicitly cached — caching is explicit (`dedupe`, headers, compression settings).

## Related

- [Architecture](architecture.md)
- [Rendering](rendering.md)
- [Glossary)(project/glossary.md)
