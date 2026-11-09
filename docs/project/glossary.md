# Glossary

> The words used across these docs, with the code that backs them.

**Last verified against v0.1.1.**

| Term | Meaning |
|---|---|
| **app directory** | `src/app/` — pages, layouts, middleware, not-found, error boundaries |
| **api directory** | `src/api/` — HTTP endpoint routes (`route.ts`) |
| **loader** | A route module export that runs on the server before render; result is serialized into the HTML |
| **action** | A route module export that handles POST mutations; re-renders the route with `actionData` |
| **contract** | A Standard Schema attached to a route validating `params`, `search`, and bodies — failures return 400 |
| **route types** | Generated `.d.ts` (`.frost/types/routes.d.ts`) powering typed `<Link>` and params |
| **server function** | `createServerFn` — typed RPC callable from client code over `/_frost/fn` |
| **middleware** | `app/_middleware.ts` — one chain running before routing for pages and APIs |
| **island / client component** | A `"use client"` module hydrated in the browser; everything else is server-only |
| **boundary** | The build-time rule separating server and client modules (`FROST_E_BOUNDARY`) |
| **request context** | `FrostRequestContext` — per-request `requestId`, `ip`, `userAgent`, `params`, `url` |
| **error report** | `FrostErrorReport` — structured error payload with stable `FROST_E_*` code, rendered to overlay + terminal |
| **determinism check** | Dev-only double render that warns when output would cause hydration mismatch |
| **adapter** | The host layer: `@frost.js/adapter-node` (node:http) or `createFetchAdapter` (Web fetch) |
| **scaffold** | What `create-frost-app` generates — `starter` (default) or `minimal` |
| **explicit execution** | Frost's design idea: server work, client hydration, contracts, and boundaries are visible files and types |

## Related

- [Concepts](../concepts.md) — the mental model behind these terms
