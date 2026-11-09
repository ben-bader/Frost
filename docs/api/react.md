# @frost.js/react

> React bindings — document shell, hydration, `<Link>`, error boundaries, client entry.

**Last verified against v0.1.1.**

## Install

```bash
npm install @frost.js/react
```

Most apps never import this — the Vite plugin wires hydration automatically. Import for custom document shells or client components.

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `Document`/`renderDocument` (`document.ts`) | components/fns | HTML document shell with head/meta/preloads |
| `hydrateApp` (`client.ts`) | fn | Client hydration bootstrap |
| `Link` (`link.ts`) | component | Anchor with client-router awareness |
| `ErrorBoundary` (`error-boundary.ts`) | component | React error boundary for islands |
| `FrostRequestContext` React context (`context.ts`) | context | Request data in client components |
| `useLoaderData`, `useRouteParams`, `usePathname`, `useFrostContext` | hooks | Read route data/params/pathname in components |
| `FrostProvider`, `getClientState`, `isFrostClientState` | provider/fns | Client state plumbing for hydration |
| `FrostDocument`, `FrostErrorBoundary`, `FrostErrorFallback` | components | Document shell + error UI |
| `getRouteComponents`, `registerRouteComponents` | fns | Client route-component registry |
| `matchPattern`, `initClientRouter` | fns | Client-router internals (experimental) |

## Notes

- Client components opt in via the `"use client"` directive handled by the Vite plugin's boundary transform — see [architecture](../architecture.md).
- `<Link>` prefetches on intent when `router.enabled` + `router.prefetch` are set.

## Related

- [Rendering](../rendering.md) · [Client router](../guides/client-router.md)
