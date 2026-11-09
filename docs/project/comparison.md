# Comparison

> Frost vs Next.js (App Router), React Router (framework mode), and TanStack Start — fair, sourced, and honest about where Frost is behind.

**Last verified against v0.1.1.**

This page expands the README comparison table. Every competitor claim links to official documentation; Frost claims link to repo code/docs. "Verified" dates are when we last checked the source.

## Sources and last verified

| Source | URL | Verified |
|---|---|---|
| Next.js docs — typedRoutes | https://nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes | 2026-11 |
| Next.js docs — TypeScript | https://nextjs.org/docs/app/api-reference/config/typescript | 2026-11 |
| Next.js docs — fetching data | https://nextjs.org/docs/app/getting-started/fetching-data | 2026-11 |
| Next.js docs — server & client components | https://nextjs.org/docs/app/getting-started/server-and-client-components | 2026-11 |
| React Router — route modules | https://reactrouter.com/main/start/framework/route-module | 2026-11 |
| React Router — route module type safety | https://reactrouter.com/how-to/route-module-type-safety | 2026-11 |
| React Router — data loading | https://reactrouter.com/main/start/framework/data-loading | 2026-11 |
| React Router — actions | https://reactrouter.com/main/start/framework/actions | 2026-11 |
| TanStack Start — server functions | https://tanstack.com/start/latest/docs/framework/react/guide/server-functions | 2026-11 |
| TanStack Start — hosting | https://tanstack.com/start/latest/docs/framework/react/guide/hosting | 2026-11 |
| TanStack Start — selective SSR | https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr | 2026-11 |

## Side-by-side

| Dimension | Frost | Next.js (App Router) | React Router (framework) | TanStack Start |
|---|---|---|---|---|
| Rendering model | SSR + streaming + hydration; opt-in client router | SSR/RSC, streaming, PPR options | SSR + client navigation (Remix lineage) | SSR with selective-SSR islands |
| Data loading | `loader` per route, parallel across layouts | `fetch` + caching in server components; route handlers | `loader` per route, parallel | `loader` + server functions |
| Route typing | Generated route types + contracts (params/search validation) | `typedRoutes` (opt-in) + generated route types | `+types` generated per route (typegen) | Generated route tree types |
| Contract validation | Runtime validation of params/search/body (`FROST_E_CONTRACT`) | Type-level only (no runtime schema unless you add one) | Type-level via generated types | Type-level; validators via standard-schema |
| Client/server boundary | Build-time enforcement (`"use client"` islands; `FROST_E_BOUNDARY`) | RSC boundary — server components by default | No RSC; client components with `.client` loaders | Server functions + selective SSR |
| Dev error UX | Overlay (`role="alertdialog"`) + terminal block, stable `FROST_E_*` codes | Overlay + terminal errors | Error boundaries + dev tools | Devtools + error surfaces |
| Deployment | Node adapter; fetch adapter for edge; Docker | Vercel-first, self-host Node | Node/Bun/Deno/Cloudflare adapters | Nitro-based multi-target |
| Mutations | `action` exports + `createServerFn` RPC | Server actions | `action` exports | Server functions |
| Maturity / ecosystem | 0.1.x, one adapter, small community | Large ecosystem, long history | Large ecosystem (React Router 7) | Growing, TanStack ecosystem |
| Bundle approach | Per-route client entries + shared chunks | App Router bundling | Route modules | Vinxi/Nitro pipeline |

Cells we could not verify against official docs were omitted rather than guessed.

## Where Frost is honest about being behind

- **Ecosystem** — no plugin marketplace, no large example corpus, one official adapter.
- **Maturity** — 0.1.x; API may change before 1.0.
- **RSC** — Frost does not implement React Server Components; it uses explicit `"use client"` islands instead. If your team depends on RSC semantics (server components as default, `"use server"` actions), Frost is not the fit today.
- **Deployment targets** — Node is the tested path; the fetch adapter exists but has fewer production deployments behind it.

## Choose Frost if

- You want the execution model visible: loaders, hydration, contracts, and boundaries are explicit files and types you can read.
- You want contract validation (runtime param/search checks) built in, not bolted on.
- You want a small, readable framework you can audit end-to-end.

## Choose something else if

- You need RSC semantics or the Vercel ecosystem → Next.js.
- You want the Remix/React-Router mental model and its adapter ecosystem → React Router.
- You want TanStack Query/ecosystem integration and selective SSR → TanStack Start.
- You need many production adapters today → any of the above.

## Methodology

Frost column: verified against this repo's source and docs (see `docs/api/`, `docs/architecture.md`). Competitor columns: official documentation only, URLs above. We did not run comparative benchmarks — no performance claims are made here.

## Related

- [README comparison table](../../README.md) · [Architecture](../architecture.md)
