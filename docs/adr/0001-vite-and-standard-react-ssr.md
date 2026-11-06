# ADR 0001: Vite Build Pipeline and Standard React SSR/Hydration

## Status
Accepted

## Context
Full-stack web frameworks often choose between:
1. Developing a proprietary bundler/compiler (e.g. Turbopack, SWC custom runtime).
2. Implementing custom React Server Component (RSC) wire formats and flight protocols.
3. Building atop mature, extensible industry-standard tools like Vite and React DOM's established `renderToString` / `renderToPipeableStream` and `hydrateRoot`.

Developing custom bundlers and proprietary RSC implementations introduces immense maintenance overhead, ecosystem incompatibilities, opaque compiler behaviors, and unstable debugging experiences.

## Decision
Frost adopts:
1. **Vite** as its development server and production build engine:
   - Incremental ES module transforms and ultra-fast HMR in development.
   - Dual-target Rollup builds (client bundle and server SSR bundle).
   - Standard Vite plugin hooks for environment boundary validation and route compilation.
2. **React DOM SSR and Hydration**:
   - `renderToPipeableStream` (Node.js) / `renderToString` for server-side HTML generation.
   - `hydrateRoot` for client-side hydration.
   - Preserves ordinary React component lifecycles, hooks, and third-party libraries.
   - Postpones proprietary RSC wire protocols until standard React APIs and ecosystem conventions stabilize.

## Consequences
- **Positive:**
  - High developer velocity and instant ecosystem compatibility (standard React hooks, state management, CSS modules, Tailwind, etc.).
  - Predictable execution: code in SSR renders once to HTML on server, then hydrates in the browser.
  - Lightning-fast development HMR powered by Vite.
- **Negative:**
  - Does not provide zero-client-JS component splitting in v1 (all components in a route bundle hydrate on the client unless marked client-only or statically rendered).
  - Boundary between server-only data logic and client UI must be explicitly managed via Loaders/Actions and `.server.ts` conventions rather than component-level async server functions.
