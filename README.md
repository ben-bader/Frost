# Frost

Frost is a React-first full-stack framework built around explicit execution, server/client separation, and a predictable runtime model. It aims to make SSR, hydration, routing, and data loading understandable without hidden framework magic.

## What Frost is

Frost is designed for apps where developers should be able to answer these questions quickly:

- Where does this code run?
- When is this route rendered?
- Which data came from the server versus the browser?
- How does hydration reconnect state?
- What is the runtime boundary between client and server code?

The framework is intentionally small and explicit, using standard React concepts layered on top of a server runtime, route contracts, and package-level boundaries.

## Design philosophy

- Explicit execution: server, client, and shared modules are treated as distinct scopes.
- Visible data flow: loaders and route data are part of the app contract instead of implicit framework behavior.
- React compatibility: the framework works with standard React SSR and client hydration patterns.
- Host independence: the core runtime is not tied to a single deployment target.
- Clear debugging: route errors, source traces, and hydration mismatches are surfaced in a useful way.

## Architecture

The repository is organized as a monorepo of framework packages and example apps.

```text
frost/
├── apps/
├── docs/
├── examples/
│   └── starter/
├── packages/
│   ├── adapter-node/
│   ├── cli/
│   ├── core/
│   ├── data/
│   ├── react/
│   ├── router/
│   ├── server/
│   └── vite/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

The main building blocks are:

- `@frostjs/core`: shared framework contracts and runtime primitives.
- `@frostjs/router`: route discovery and matching.
- `@frostjs/server`: server request lifecycle and response generation.
- `@frostjs/react`: React SSR and hydration helpers.
- `@frostjs/data`: data loaders/actions and request-level execution.
- `@frostjs/vite`: Vite integration and framework runtime behavior.
- `@frostjs/adapter-node`: Node.js hosting adapter.

## Installation

This repo uses pnpm workspaces.

```bash
git clone <repo-url>
cd frost
pnpm install
```

## Quick start

Run the starter app:

```bash
pnpm --dir examples/starter dev
```

Then open:

```text
http://localhost:3000
```

## Development commands

From the repo root:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Starter-specific commands:

```bash
pnpm --dir examples/starter dev
pnpm --dir examples/starter build
pnpm --dir examples/starter start
```

## Production build and deployment

The framework packages can be built with the workspace build script:

```bash
pnpm build
```

The starter app can also be production-built and started with its local scripts.

```bash
pnpm --dir examples/starter build
pnpm --dir examples/starter start
```

## Routes

The starter app ships two routes:

- `/` — Demo: a hero-only landing page (headline, CTAs, dot cue) with the shared header.
- `/playground` — Playground: a client-side counter and an error-log dialog that opens automatically once per visit.

### What's in this starter

- `/` demo page and `/playground` playground — route components live in `src/app/page.tsx` and `src/app/playground/page.tsx`; add a `loader` export in a route file when a page needs server data.
- Shared chrome and client islands: `src/components/` (`Header`, `Counter`, `ErrorDialog`) — anything using `useState`/`useEffect` hydrates on the client.
- Design tokens and the only stylesheet: `src/styles/theme.css`.
- Framework config: `frost.config.ts`; scripts in `package.json` (`dev`, `build`, `start`, `test`).

## CSS and font loading

Stylesheets are discovered per route and emitted as real `<link rel="stylesheet">` tags in the server-rendered `<head>` — before first paint and independent of hydration.

- **Development:** the Vite plugin walks each route's module graph (page + layout chain) for CSS imports and serves the compiled CSS through `/@frost/css?url=...`. Vite HMR continues to work normally.
- **Production:** `frost build` produces a client bundle per route plus a manifest. The server resolves each route's CSS and JS from the manifest and renders hashed asset URLs. Font files emitted by `@fontsource` are referenced from the stylesheet and the primary weights are preloaded with `crossorigin`.

Because the stylesheet link is in the initial HTML, there is no flash of unstyled content and no layout shift from late-loading CSS.

## SSR and hydration

Frost supports SSR by rendering route content on the server and serializing route data for the browser. During hydration, the client reconnects to the same route payload instead of re-running server logic. The `/playground` counter demonstrates this: it renders `0` on the server and becomes interactive only after hydration.

## Routing and data loading

Routes are discovered from the application source tree, and loaders provide route data before page rendering. The router and server packages cooperate to match URL patterns and execute the correct request lifecycle.

A typical route looks like this:

```tsx
export async function loader({ request }: Route.LoaderArgs) {
  return { message: "hello from the server" };
}

export default function Page({ data }: Route.ComponentProps<{ message: string }>) {
  return <div>{data.message}</div>;
}
```

## Server/client boundaries

One of Frost's central guarantees is that server-only code stays server-only. The framework aims to keep modules with server-only behavior out of client bundles and make those boundaries explicit to developers.

## Error handling

`@frostjs/react` ships a `FrostErrorBoundary` that captures render errors with route, phase, component stack, and source location when available. In development it renders a diagnostic dialog with the error type, message, source file/line, expandable stack traces, copy-message/copy-report actions, and dismiss/retry recovery. In production it falls back to a safe message without leaking filesystem paths or internals.

Note: React error boundaries catch render errors only — not event-handler or asynchronous errors.

## Current limits

This repository is still evolving. Some areas are intentionally minimal or experimental, including the playground shell and developer diagnostics. The goal is to keep the framework behavior real and demonstrable without claiming unsupported production features.

## Contribution workflow

1. Create a focused branch.
2. Update or add tests alongside behavioral changes.
3. Run the project test suite and type checks.
4. Keep examples aligned with the actual framework runtime.
5. Document any API or routing changes in the package or docs.

## Tailwind CSS

Tailwind is a valid fit for Frost applications, but the repo is intentionally keeping the framework integration lightweight and consistent with the existing Vite-based build pipeline. Use the framework's Vite integration and confirm SSR/hydration remain stable when adding CSS tooling.

## Docs and references

- `examples/starter/` — live starter/playground app
- `packages/` — framework implementation
- `docs/` — design and architecture notes

