# Frost

> **A React-based full-stack framework with explicit execution, visible caching, and host independence.**  
> Primary goal: Build a shippable, open, predictable alternative to Next.js.

---

## Core Promise

A developer should be able to answer these questions without guessing:

- **Where does this code execute?**
- **When is this page rendered?**
- **Where did this data come from?**
- **Is this response cached?**
- **Who can access this server function?**
- **What will be included in the browser bundle?**
- **Why did this page rebuild?**
- **What happens if the application runs on another host?**
- **Which framework version and configuration are supported?**

---

## Architectural Principles

1. **Explicit execution:** Server code, browser code, and universal code follow clear, enforceable boundaries.
2. **Visible caching:** Opt-in by default. Explicit TTLs, cache keys, and tag-based invalidation.
3. **React compatibility:** Standard React DOM SSR and hydration without custom component runtimes.
4. **Host independence:** Fully supported on standard Node.js LTS, with no proprietary vendor lock-in.
5. **Debuggable infrastructure:** Inspectable routes, cache decisions, rendering ledgers, and dependency graphs.
6. **Secure defaults:** Server secrets never cross into client bundles; backend operations validate independently of UI state.
7. **Measurable performance:** Vite-powered fast builds, route code splitting, and reproducible benchmarks.

---

## Monorepo Layout

```text
frost/
├── packages/
│   ├── core/           # Framework configuration, contracts, context, shared errors
│   ├── react/          # React SSR / hydration orchestration, error boundaries, hooks
│   ├── router/         # Route discovery, trie matcher, layouts, navigation
│   ├── server/         # Request lifecycle, middleware, HTTP abstractions, security
│   ├── data/           # Loaders, actions, request memoization, typed server functions
│   ├── cache/          # Cache policies, memory & distributed adapters, tag invalidation
│   ├── build/          # Build coordinator, manifest generation, entrypoints
│   ├── vite/           # Vite plugin integration, boundary enforcement, HMR
│   ├── cli/            # frost CLI (dev, build, start, preview, routes, inspect)
│   ├── adapter-node/   # Production Node.js HTTP server adapter
│   ├── testing/        # Test utilities, request simulation, hydration assertions
│   └── devtools/       # Route inspector, cache inspector, rendering ledger UI
├── examples/           # Validated sample applications
├── docs/               # Architecture documents and ADRs
└── tests/              # End-to-end and cross-package integration tests
```

---

## Roadmap

- **Phase 0:** Architecture freeze (ADRs, contract definitions, threat model)
- **Phase 1:** Minimal vertical slice (CLI, Vite SSR/hydration, file route, loader, Node server)
- **Phase 2:** Routing & Data (nested layouts, dynamic params, actions, generated types)
- **Phase 3:** Explicit Caching (memoization, route caching, tag invalidation, inspector)
- **Phase 4:** Security & Boundaries (server/client AST boundary validation, secret leaks)
- **Phase 5:** Build & Deployment (production manifest, static export, Node.js adapter)
- **Phase 6:** Developer Experience (CLI diagnostics, DevTools, testing helpers)
- **Phase 7-9:** Real-world validation, beta, and stable 1.0 release

---

## Documentation

Full architectural specification: [docs/spec/FROST_SPECIFICATION.md](docs/spec/FROST_SPECIFICATION.md).
