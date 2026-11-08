# FROST
## Framework Architecture and Technical Specification

**Document type:** Foundational architecture and product specification  
**Project:** Frost  
**Framework category:** React-based full-stack web framework  
**Language:** TypeScript  
**Status:** Proposed architecture, not yet implemented  
**Primary goal:** Build a shippable, open, predictable alternative to Next.js.

---

# 1. Product vision

Frost is a React-based full-stack framework for building production web applications with server rendering, static generation, client-side navigation, backend endpoints, typed data access, caching, authentication integration and flexible deployment.

Frost should provide the capabilities developers expect from a modern full-stack framework without forcing them to understand a large collection of implicit rules before they can build an application.

Frost is not a React replacement. React remains the UI library. Frost owns the application architecture around React.

## 1.1 Core promise

A developer should be able to answer these questions without guessing:

- Where does this code execute?
- When is this page rendered?
- Where did this data come from?
- Is this response cached?
- Who can access this server function?
- What will be included in the browser bundle?
- Why did this page rebuild?
- What happens if the application runs on another host?
- Which framework version and configuration are supported?

Every architectural decision should make those answers more explicit.

## 1.2 Product principles

### Principle A: Explicit execution

Server code, browser code and code that can safely execute in both environments must have clearly defined rules.

### Principle B: Visible caching

Caching is opt-in for application data in the initial release. Every cache entry must have a documented lifetime, key, invalidation mechanism and scope.

### Principle C: React compatibility

Use React and React DOM rather than implementing a competing component runtime. Preserve ordinary React components, hooks and established ecosystem integrations wherever the rendering mode supports them.

### Principle D: Host independence

A standard Node.js deployment must be fully supported. Frost must not require a proprietary hosting platform, proprietary cache, or proprietary build service.

### Principle E: Debuggable infrastructure

Build output, route behavior, cache decisions, server requests and rendering failures should be observable through supported diagnostics.

### Principle F: Stable conventions

Prefer a small set of consistent APIs over multiple competing ways to accomplish the same task. Deprecations must follow a documented policy.

### Principle G: Secure defaults

Browser bundles must not contain server secrets. Backend operations must validate inputs and enforce authorization independently of the UI.

### Principle H: Measurable performance

No automatic optimization should be advertised as effective without reproducible measurements.

---

# 2. Target users and use cases

Frost should support four primary application categories.

1. **Content websites:** documentation, blogs, landing pages, portfolios and public marketing sites.
2. **Full-stack products:** SaaS dashboards, customer portals, administrative interfaces and subscription products.
3. **Commerce applications:** catalogs, search, product pages, carts and checkout integrations.
4. **Interactive applications:** editors, collaborative interfaces and data-heavy applications that require client-side state.

The framework must support both content-oriented pages and highly interactive React applications without forcing every route into the same rendering strategy.

---

# 3. Technology decisions

These are proposed initial architectural decisions. They must be validated against the exact dependency versions chosen during implementation.

| Area | Decision |
|---|---|
| UI | React and React DOM |
| Language | TypeScript |
| Package management | pnpm workspace |
| Runtime | Node.js LTS |
| Build integration | Vite-based adapter |
| Routing | Frost-owned file-based route convention |
| Server rendering | React DOM server rendering |
| Client rendering | React DOM hydration and client rendering |
| Styling | CSS, CSS Modules and ecosystem-compatible integrations |
| Testing | Vitest, React Testing Library and browser automation |
| Documentation | Markdown with executable examples |
| Deployment | Node.js server, static output and explicit platform adapters |
| Public packages | Scoped packages under `@frost.js/*`, subject to npm availability |

Do not develop a custom JavaScript compiler, custom JSX language, custom React renderer or custom browser runtime.

Use existing infrastructure unless a specific missing capability justifies an independently maintained subsystem.

## 3.1 React Server Components decision

The first stable release should not depend on a proprietary implementation of the React Server Components protocol.

Start with React's established SSR and hydration APIs. Build reliable routing, server/client boundaries, caching, data loading and deployment around those APIs.

Server Components can be introduced later through an isolated, version-pinned integration if the required React APIs and ecosystem support meet the project's stability criteria.

This avoids making an experimental or incompletely supported rendering protocol a prerequisite for the entire framework.

The initial limitation must be documented: conventional SSR and hydration do not provide the same server-only component execution model as a complete React Server Components implementation.

---

# 4. Architecture overview

Frost is divided into independent packages with explicit responsibilities.

```text
Application source
       |
       v
Frost CLI
       |
       v
Frost configuration
       |
       v
Application compiler / build coordinator
       |
       +----------------------+
       |                      |
       v                      v
Client build             Server build
       |                      |
       v                      v
Browser assets           SSR application
       |                      |
       +-----------+----------+
                   |
                   v
            Frost request runtime
                   |
        +----------+----------+
        |          |          |
        v          v          v
      Router    Data/cache   Middleware
        |          |          |
        +----------+----------+
                   |
                   v
             React rendering
                   |
                   v
          HTTP response / HTML
```

The diagram describes logical responsibilities, not a requirement to implement every subsystem as a separate process.

## 4.1 Package boundaries

```text
frost/
├── apps/
│   └── documentation/
├── packages/
│   ├── cli/
│   ├── core/
│   ├── react/
│   ├── router/
│   ├── server/
│   ├── data/
│   ├── cache/
│   ├── build/
│   ├── vite/
│   ├── testing/
│   ├── devtools/
│   ├── adapter-node/
│   └── create-frost/
├── examples/
├── tests/
├── benchmarks/
├── docs/
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
└── tsconfig.base.json
```

Create packages only when their boundaries are justified. The initial implementation may keep tightly coupled internal modules together while preserving public API boundaries.

### Package responsibilities

**`@frost.js/core`**
- Framework configuration types.
- Shared error types.
- Request context contracts.
- Framework lifecycle contracts.
- Environment and runtime abstractions.

**`@frost.js/react`**
- React integration.
- SSR and hydration orchestration.
- Error boundary integration.
- React-specific runtime utilities.

**`@frost.js/router`**
- Route discovery.
- Route matching.
- Layout hierarchy.
- Route parameters.
- Navigation and redirects.
- Route-level loading and error behavior.

**`@frost.js/server`**
- Request lifecycle.
- Middleware.
- HTTP responses.
- Request-scoped context.
- Security headers and error handling.

**`@frost.js/data`**
- Server-only data functions.
- Request-scoped deduplication.
- Data-loading contracts.
- Mutation and invalidation integration.

**`@frost.js/cache`**
- Cache policy.
- Cache keys and namespaces.
- TTL and stale policy.
- Tag-based invalidation.
- Adapter interface and observability.

**`@frost.js/build`**
- Build orchestration.
- Server/client entry-point generation.
- Manifest contracts.
- Production artifact validation.

**`@frost.js/vite`**
- Vite plugin integration.
- Route discovery integration.
- Environment-specific module validation.
- Development server integration.
- Production build hooks.

**`@frost.js/cli`**
- Development commands.
- Build and preview commands.
- Diagnostics.
- Type generation.
- Project inspection.

**`@frost.js/adapter-node`**
- Production Node.js HTTP server.
- Static asset serving.
- SSR request handling.
- Graceful shutdown and runtime health.

**`@frost.js/testing`**
- Route tests.
- Request simulation.
- Server-function tests.
- Cache tests.
- Rendering and hydration helpers.

**`@frost.js/devtools`**
- Route inspector.
- Rendering-mode inspection.
- Cache-decision inspection.
- Build graph inspection.
- Request and render diagnostics.

---

# 5. Application developer experience

A new application should start with one command:

```bash
npm create frost-app@latest my-app
```

The scaffolder must support interactive prompts and command-line flags.

The default starter should include:
- React and TypeScript.
- A working homepage.
- File-based routing.
- A server-rendered route.
- A client-interactive component.
- A server-only data function.
- A backend endpoint.
- A working test.
- A production build.
- A Node.js production adapter.
- A README with exact setup instructions.

The default application should not require a database, authentication provider, CSS framework or cloud account.

## 5.1 Project structure

```text
my-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── users/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── loading.tsx
│   ├── components/
│   ├── server/
│   │   └── users.ts
│   ├── api/
│   │   └── health.ts
│   └── styles/
├── public/
├── tests/
├── frost.config.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

This structure is illustrative. The implementation must settle a single route-discovery convention and document it before shipping.
Do not support multiple overlapping routing conventions in the first release.

---

# 6. Routing specification

Frost owns its route model and maps files to routes during development and build.

## 6.1 Route mapping

| File | Route |
|---|---|
| `src/app/page.tsx` | `/` |
| `src/app/about/page.tsx` | `/about` |
| `src/app/users/page.tsx` | `/users` |
| `src/app/users/[id]/page.tsx` | `/users/:id` |
| `src/app/docs/[...slug]/page.tsx` | `/docs/*slug` |

Define precedence rules for static, dynamic and catch-all routes. Ambiguous route definitions must fail during development or build with an actionable diagnostic.

## 6.2 Route module contract

A route module may export:
- A default React component.
- `loader` for server-side route data.
- `action` for route mutations.
- `metadata` for document metadata.
- `shouldRevalidate` for explicit data revalidation decisions.
- Route-specific rendering configuration.
- Route-specific error and loading components, where applicable.

Example:

```tsx
import { getUser } from "@/server/users";

export async function loader({ params }: Route.LoaderArgs) {
  const user = await getUser(params.id);

  if (!user) {
    throw new Response("Not Found", { status: 404 });
  }

  return { user };
}

export default function UserPage({
  data,
}: Route.ComponentProps) {
  return <h1>{data.user.name}</h1>;
}
```

The exact generated types and function signatures must be defined in the public API specification before implementation.

## 6.3 Route behavior

The router must define:
- URL normalization.
- Trailing-slash behavior.
- Query-string handling.
- Dynamic parameter decoding.
- Redirect behavior.
- Nested layouts.
- Not-found handling.
- Error boundaries.
- Loading states.
- Route prefetching.
- HTTP method handling.
- Metadata merging.
- Route-specific cache policy.

All behavior must be testable independently of the browser.

## 6.4 Navigation

Provide a framework navigation API that supports:
- Client-side navigation.
- Browser history.
- Back and forward.
- Scroll restoration.
- Link prefetching.
- Pending navigation indicators.
- Error recovery.
- Direct URL loading.
- Full-page fallback when client navigation cannot safely proceed.

Navigation must not silently reuse data when the route's invalidation rules require a refresh.

---

# 7. Rendering model

Frost should support four explicit rendering modes.

## 7.1 Static rendering

The route is rendered during the build.

Suitable for:
- Documentation.
- Marketing pages.
- Public content.
- Static product information.

Rules:
- No request-specific cookies or headers.
- No implicit dependence on runtime user identity.
- No hidden database dependency unless the build explicitly permits it.
- Build failures identify the route and underlying error.

## 7.2 Server-side rendering

The route renders for each request, subject to explicitly configured caching.

Suitable for:
- Personalized pages.
- Frequently changing content.
- Authenticated views.
- Request-dependent metadata.

Rules:
- Request-specific information is scoped to the current request.
- No user-specific data enters a shared cache without a verified isolation strategy.
- Server rendering does not automatically make every response uncacheable; policy determines that explicitly.

## 7.3 Incremental regeneration

Frost should support rebuilding cached rendered output without requiring a complete application rebuild.

Proposed controls:
- Time-based expiration.
- Explicit invalidation.
- Tag-based invalidation.
- Stale-while-revalidate behavior.
- Per-route policy.
- Observable regeneration state.

The implementation must define concurrency control, failed regeneration behavior, and stale response behavior.

## 7.4 Client-rendered routes

Frost must also support highly interactive applications where the browser is the primary rendering environment.

The client-rendering option should not require server rendering to be enabled for every route.

## 7.5 Rendering mode declaration

Rendering behavior should be visible in route configuration:

```ts
export const rendering = {
  mode: "server",
  cache: {
    mode: "no-store",
  },
} satisfies Route.RenderingConfig;
```

The example illustrates the proposed API; the exact type must be finalized before release.
The framework should reject incompatible configurations instead of silently guessing.

---

# 8. Server/client module boundaries

This is a core Frost differentiator.

## 8.1 Module categories

Frost recognizes three categories:

**Universal modules**
Safe to import into both server and client graphs. These may contain pure functions, shared types and environment-independent utilities.

**Server-only modules**
May access databases, secrets, server filesystem APIs and privileged services. They must never enter the client bundle.

**Client-only modules**
May access browser APIs, DOM elements, browser storage and client-specific integrations. They must not execute as part of server rendering.

## 8.2 Proposed file conventions

```text
users.ts           Universal module
users.server.ts    Server-only module
chart.client.tsx   Client-only module
```

The framework must also provide explicit markers where file naming is insufficient.

## 8.3 Build enforcement

During development and production builds, Frost must:
1. Construct server and client dependency graphs.
2. Follow static imports and re-exports.
3. Inspect literal dynamic imports when statically resolvable.
4. Reject server-only imports in the client graph.
5. Reject client-only imports in the server graph.
6. Detect forbidden Node.js built-ins in browser code.
7. Report the importing file and dependency chain.
8. Handle package exports and aliases using the configured bundler's resolution rules.
9. Clearly report dependencies whose internal graphs cannot be inspected.

External JavaScript packages that cannot be inspected must not be treated as proven safe.
Provide a configurable policy for warning or failing on opaque dependencies.
A trusted-dependency exception must be explicit and documented.

## 8.4 Client boundaries

The first release must use React's supported rendering model and must not claim complete Server Component semantics without implementing the necessary protocol.

Client-only components may be explicitly marked with `"use client"` where Frost's compiler and bundler support the convention.

Document exactly what this directive means in Frost. Do not imply that a directive alone provides security or complete server-only execution guarantees.

## 8.5 Secret protection

The framework must:
- Keep server environment variables out of browser bundles.
- Expose only explicitly public environment variables.
- Fail builds when known server-only imports cross into the client graph.
- Avoid printing secret values in diagnostics.
- Document the limitations of static dependency analysis.

---

# 9. Data loading and mutations

Frost must avoid forcing every data operation into an implicit component-level fetch model.

## 9.1 Loaders

Loaders are the primary route data-loading mechanism.

Requirements:
- Run in the server environment unless explicitly configured otherwise.
- Receive typed route parameters, URL information and request context.
- Support asynchronous operations.
- Support cancellation where the underlying operation allows it.
- Allow independent operations to execute concurrently.
- Provide request-scoped deduplication.
- Return structured data or explicit HTTP responses.
- Integrate with route error handling.
- Define cache behavior explicitly.

Example:

```tsx
export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await usersRepository.findById(params.id);

  if (!user) {
    throw new Response("Not Found", { status: 404 });
  }

  return { user };
}
```

Repositories and database access remain application responsibilities. Frost should not impose a specific ORM.

## 9.2 Actions

Actions handle mutations.

They must define:
- Accepted HTTP methods.
- Input validation.
- Authentication requirements.
- Authorization requirements.
- CSRF protections where applicable.
- Error responses.
- Cache invalidation.
- Transaction responsibilities.
- Request cancellation behavior.
- Duplicate submission handling where needed.

Example:

```ts
export async function action({ request }: Route.ActionArgs) {
  const session = await requireSession(request);
  const input = await parseAndValidateForm(request);

  await updateProfile(session.userId, input);

  return { success: true };
}
```

This example illustrates the contract, not a complete production security implementation.

## 9.3 Typed backend operations

Frost should offer typed server functions for convenient application code.

However, every server function reachable through a browser request is a public-facing attack surface.

The framework must not rely on hidden UI state, disabled buttons or TypeScript types for authorization.

Server functions must have explicit exposure rules, input validation and predictable HTTP semantics.

## 9.4 API routes

Provide a route convention for API endpoints, supporting:
- Standard HTTP methods.
- JSON responses.
- Streaming responses where supported by the host.
- Request body limits.
- Typed validation.
- Status codes.
- Headers.
- Authentication integration.
- Rate-limiting integration points.
- OpenAPI generation as a future or optional extension.

Avoid maintaining separate, inconsistent implementations of page actions and API handlers.

---

# 10. Caching architecture

Caching must be one of Frost's strongest differentiators.

## 10.1 Default policy

Application data is uncached by default unless the developer explicitly opts in or selects a documented route policy.

This rule must apply consistently across development and production.

Static build output is inherently reusable as a build artifact, but it must not accidentally capture private request data.

## 10.2 Cache layers

Frost distinguishes:
1. Request-scoped memoization.
2. Application data cache.
3. Rendered route cache.
4. Static build artifacts.
5. Browser and CDN HTTP caching.

These layers must have distinct names, APIs and diagnostics.

## 10.3 Cache declaration

Example:

```ts
const product = await frost.cache(
  `product:${productId}`,
  () => productsRepository.findById(productId),
  {
    ttl: 60,
    tags: [`product:${productId}`],
  },
);
```

The exact API and units must be finalized. Prefer explicit duration names in the final API to avoid ambiguity.

## 10.4 Cache requirements

Every cache policy must specify:
- Cache key.
- Lifetime.
- Cache scope.
- Data ownership.
- Invalidation behavior.
- Stale data behavior.
- Failure behavior.
- Persistence expectations.
- Concurrency behavior.

## 10.5 Invalidation

Support explicit invalidation:

```ts
await frost.invalidateTag(`product:${productId}`);
```

Invalidation must work through a documented adapter contract.

For multi-instance deployments, the framework must not pretend that an in-memory cache provides distributed invalidation.

## 10.6 Cache safety

Frost must prevent accidental cross-user data leakage by default.

Shared cache keys must not omit security-relevant dimensions when data depends on identity, permissions, locale or tenant.

Authenticated response caching must require an explicit, validated policy.

## 10.7 Cache observability

Development diagnostics must explain:
- Whether a cache was read or written.
- Which cache layer was involved.
- Why a request was a hit or miss.
- The effective lifetime.
- The invalidation tags.
- Whether a result was stale.
- Which configuration caused the behavior.

Never expose sensitive cache contents in public diagnostics.

---

# 11. Performance architecture

Performance is a measurable property, not a marketing claim.

## 11.1 Build performance

Frost should use Vite's mature build and development infrastructure rather than creating a new bundler.

Required capabilities:
- Incremental development transforms.
- Fast hot module replacement.
- Separate server and client builds.
- Tree-shaking.
- Route-level code splitting.
- Chunk inspection.
- Build caching where supported.
- Source maps.
- Actionable compiler errors.

Build cache invalidation must be deterministic and inspectable.

## 11.2 Browser performance

Frost should provide:
- Route-level code splitting.
- Lazy loading for explicitly deferrable components.
- Link prefetching with configurable limits.
- Asset manifest generation.
- Resource hints where appropriate.
- Bundle analysis.
- Server/client bundle size reporting.
- Optional image processing integration.
- Hydration diagnostics.

Do not claim automatic partial hydration or zero-JavaScript rendering unless those behaviors are actually implemented.

## 11.3 Server performance

The server runtime must support:
- Reusable application instances.
- Request-scoped context.
- Connection reuse through application adapters.
- Graceful shutdown.
- Explicit request timeouts.
- Body size limits.
- Abort propagation where possible.
- Structured errors.
- Concurrency testing.
- Reproducible benchmarks.

Avoid global mutable request state.

---

# 12. Developer experience and debugging

Frost should make invisible behavior inspectable.

## 12.1 Development server

The development server must support:
- React Fast Refresh through supported tooling.
- Server module reload.
- Route discovery updates.
- Actionable TypeScript and build errors.
- Request logs.
- Rendering-mode inspection.
- Cache decision logs.
- Server/client boundary diagnostics.
- Production-like preview.

Development-only code must never accidentally ship in production output.

## 12.2 Error messages

A useful diagnostic includes:
- Stable error code.
- Human-readable explanation.
- Source location.
- Dependency or route context.
- Why the framework rejected the operation.
- A safe remediation suggestion.
- Documentation link where available.

Example:

```text
FS1004: Server-only module imported by a client entry.

Importer: src/components/Profile.client.tsx
Dependency: src/server/users.server.ts

This module cannot be included in a browser bundle.

Move the privileged operation into a server loader or action,
then pass only the required public data to the component.
```

Error codes must remain stable within a documented compatibility policy.

## 12.3 Inspector

A future Frost inspector should show:
- Discovered routes.
- Rendering modes.
- Module dependency graphs.
- Client bundle composition.
- Cache behavior.
- Request lifecycle.
- Loader and action timings.
- Hydration failures.
- Build output and warnings.

The inspector should be a separate development tool, not an essential runtime dependency.

---

# 13. Security architecture

Security is a framework requirement, not a later enhancement.

## 13.1 Required protections

- Server/client dependency boundary enforcement.
- Safe HTML rendering through React.
- Explicit handling of unsafe HTML.
- URL validation where framework APIs accept URLs.
- CSRF protections for cookie-authenticated mutations.
- Request body limits.
- Request timeouts.
- Secure cookie guidance and helpers.
- Configurable security headers.
- No secret leakage through public environment variables.
- No unvalidated authorization assumptions.
- Safe error responses in production.
- Dependency vulnerability scanning in CI.

## 13.2 Authentication

Frost should provide authentication integration points and a secure session contract, not pretend that a generic login component makes an application secure.

The initial framework may provide:
- Session storage interfaces.
- Cookie helpers.
- Authentication middleware contracts.
- Route protection helpers.
- Authorization integration points.

OAuth, OpenID Connect, password handling, multi-factor authentication and account recovery should use maintained, audited implementations rather than improvised cryptographic code.

## 13.3 Multi-tenant applications

Provide documented patterns for tenant-scoped data access.

Never automatically assume that a user can access a resource because they know its identifier.

Cache keys, loaders, actions and repository operations must preserve tenant boundaries.

## 13.4 Security release policy

Before a public stable release, perform dependency auditing, threat modeling, authorization tests, cache-isolation tests and an independent security review appropriate to the framework's scope.

---

# 14. Deployment architecture

Frost must not require a specific commercial hosting platform.

## 14.1 Initial supported deployment

The first production target is a Node.js server.

The adapter must support:
- Production SSR.
- Static asset serving.
- Manifest loading.
- Correct content types.
- Compression through supported host integration.
- HTTP caching headers.
- 404 and 500 responses.
- Graceful shutdown.
- Health checks.
- Environment-based configuration.
- Request logging.
- Reverse proxy deployment.

## 14.2 Static deployment

Applications that use only static-compatible features should be exportable as static files.

The build must fail or provide an explicit diagnostic if a route requires runtime capabilities that static output cannot provide.

## 14.3 Additional adapters

Later adapters may support:
- Serverless platforms.
- Edge runtimes.
- Worker-based environments.
- Container deployments.

Each adapter must publish a capability matrix. Frost must not imply that Node.js filesystem APIs, long-lived processes or arbitrary Node packages work on every runtime.

## 14.4 Production manifest

The manifest must define:
- Client entry points.
- Generated JavaScript assets.
- CSS assets.
- Shared chunks.
- Route-level asset references.
- Asset integrity metadata where implemented.
- Build identifiers.
- Asset URL configuration.

The production host must not infer asset names from source filenames.

---

# 15. Configuration design

Frost configuration should be small, typed and validated.

Illustrative example:

```ts
import { defineConfig } from "@frost.js/core";

export default defineConfig({
  appDirectory: "src/app",

  rendering: {
    default: "server",
  },

  cache: {
    default: "no-store",
  },

  build: {
    sourcemap: true,
  },

  server: {
    port: 3000,
  },
});
```

The final configuration API must be based on implemented capabilities.

Requirements:
- TypeScript autocomplete.
- Runtime validation.
- Helpful configuration errors.
- Stable defaults.
- No silent fallback when a critical setting is invalid.
- Clear separation between build-time and runtime configuration.
- No secret values embedded in client artifacts.

---

# 16. Type safety

Frost must generate or infer types for:
- Route parameters.
- Loader data.
- Action inputs and outputs.
- Route metadata.
- Request context.
- Navigation targets.
- Configuration.
- Cache APIs.
- Error boundaries.
- Server function inputs and outputs.

The framework must not claim end-to-end type safety merely because a function has a TypeScript signature.

Runtime validation remains necessary for external input.

Generated types must be deterministic and reproducible in CI.

A type-generation failure must be actionable and must not silently fall back to broad `any` types.

---

# 17. Testing strategy

Frost must have tests at every architectural boundary.

## 17.1 Unit tests
Test individual utilities, route matching, configuration validation, cache policy, serialization and error handling.

## 17.2 Compiler and build tests
Test:
- Route discovery.
- Import resolution.
- Client/server boundary checks.
- Production output.
- Manifest correctness.
- Code splitting.
- Source maps.
- Build failures.
- Cache determinism.

## 17.3 Integration tests
Build complete sample applications and run their production servers.
Test:
- SSR.
- Static generation.
- Dynamic routes.
- Loaders.
- Actions.
- Caching.
- Redirects.
- Errors.
- Assets.
- Environment isolation.

## 17.4 Browser tests
Use real browser automation to verify:
- Hydration.
- Navigation.
- Form submission.
- Loading and error states.
- State preservation.
- Asset loading.
- Accessibility basics.
- Console errors.
- Production behavior.

## 17.5 Security tests
Include:
- Cross-user cache isolation.
- Server-secret leakage.
- CSRF scenarios.
- Authorization bypass attempts.
- Invalid request bodies.
- Path traversal attempts where relevant.
- Unsafe redirects.
- Server/client import violations.

## 17.6 Performance tests
Maintain repeatable benchmarks for:
- Development startup.
- Cold and incremental builds.
- SSR latency.
- Concurrent requests.
- Client bundle size.
- Browser startup and navigation.
- Cache hit and invalidation behavior.

Compare results against a recorded baseline instead of inventing unsupported superiority claims.

---

# 18. Public API and compatibility policy

A framework intended for release needs a predictable evolution policy.

## 18.1 Semantic versioning
- Major versions may introduce documented breaking changes.
- Minor versions add backward-compatible functionality.
- Patch versions contain backward-compatible fixes.

Pre-release packages must clearly identify their stability status.

## 18.2 API tiers
Classify APIs as:
- **Stable:** covered by compatibility guarantees.
- **Experimental:** usable but subject to documented change.
- **Internal:** not supported as public APIs.

Avoid exposing internal implementation details merely for convenience.

## 18.3 Upgrade policy
Provide:
- Migration guides.
- Deprecation warnings.
- Automated codemods when feasible.
- A supported version matrix.
- Release notes.
- Security advisories.
- An upgrade compatibility test suite.

The objective is to make normal upgrades predictable, not to promise that the framework will never evolve.

---

# 19. Frost's differentiating features

These are product commitments to implement and validate, not features to claim prematurely.

## 19.1 Rendering Ledger
Every route exposes a machine-readable record of its rendering behavior:
- Rendering mode.
- Server dependencies.
- Client dependencies.
- Dynamic request inputs.
- Cache policy.
- Assets.
- Known constraints.

This gives developers one place to inspect why a route behaves as it does.

## 19.2 Cache Inspector
Every cache decision has an inspectable explanation, including the effective policy and invalidation path.

## 19.3 Deployment Contract
Each supported deployment adapter publishes a capability matrix and passes the same shared conformance suite.

## 19.4 Boundary Diagnostics
Import violations report the complete relevant dependency path and distinguish direct, transitive and opaque dependencies.

## 19.5 Stability Windows
Frost publishes its compatibility policy and avoids unnecessary API churn. Experimental features remain separate from the stable API.

## 19.6 Production Reproduction
The development workflow should make it straightforward to run a production build locally with the same generated artifacts and host adapter.

## 19.7 Explicitness over magic
The framework should prefer inspectable defaults and stable conventions. Convenience APIs are acceptable when their behavior remains explainable.

---

# 20. Features deliberately excluded from the initial release

To keep the architecture shippable, the following should not be required for version 1:
- A custom programming language.
- A custom React renderer.
- A custom JavaScript bundler.
- A mandatory database or ORM.
- A mandatory authentication provider.
- A mandatory CSS framework.
- A proprietary hosting platform.
- A proprietary cache service.
- A custom React Server Components protocol.
- A custom global state-management system.
- A visual page builder.
- An integrated CMS.
- A mandatory cloud account.
- A custom replacement for the entire React ecosystem.

These exclusions are intentional. Frost should integrate well with existing tools instead of attempting to recreate every adjacent ecosystem.

---

# 21. Implementation roadmap

## Phase 0 — Architecture freeze
Deliver:
- Product principles.
- Public API conventions.
- Rendering model.
- Routing specification.
- Cache semantics.
- Server/client boundary policy.
- Deployment contract.
- Threat model.
- ADRs for major architectural decisions.

**Exit criterion:** the design is internally consistent and reviewed before the runtime is implemented.

## Phase 1 — Minimal vertical slice
Implement one complete application from source to production:
- React component.
- File-based route.
- TypeScript.
- SSR.
- Client hydration.
- One interactive component.
- One server loader.
- One HTTP endpoint.
- CSS and public assets.
- Production Node.js server.
- Browser test.

**Exit criterion:** the same sample application runs in development and as a production build.

## Phase 2 — Routing and data
Implement nested routes, dynamic parameters, layouts, loaders, actions, redirects, errors and generated route types.

**Exit criterion:** integration tests cover the public routing and data contracts.

## Phase 3 — Explicit caching
Implement request memoization, application caching, invalidation, rendered route caching and cache diagnostics.

**Exit criterion:** tests prove correct invalidation and isolation between users and tenants.

## Phase 4 — Security and module boundaries
Implement environment graph validation, server-only and client-only modules, request limits, security helpers and safe production error behavior.

**Exit criterion:** security-focused integration tests pass and known limitations are documented.

## Phase 5 — Build and deployment
Stabilize production manifests, asset handling, static output and the Node.js adapter.

**Exit criterion:** the same production conformance suite passes across clean installations and supported environments.

## Phase 6 — Developer experience
Implement CLI workflows, diagnostics, route inspection, bundle analysis and a usable testing package.

**Exit criterion:** a developer can create, run, test, build and deploy a sample project using documented commands.

## Phase 7 — Real-world validation
Build several independent example applications:
- Documentation website.
- SaaS dashboard.
- Content website.
- Data-heavy application.

Test fresh installations, upgrades, failures, performance and deployment portability.

**Exit criterion:** examples run independently and reveal no unresolved critical architecture defects.

## Phase 8 — Public beta
Publish versioned packages, documentation, migration policy, security reporting procedures and deployment guides.
Run compatibility tests on clean CI environments and obtain external feedback.

## Phase 9 — Stable release
Declare version 1.0 only when the supported APIs, build output, deployment adapter, security expectations and compatibility policy meet the published criteria.

---

# 22. Release acceptance criteria

Frost is not ready for a stable release until:
- [ ] A new project can be created from a published starter.
- [ ] React SSR and hydration work in production.
- [ ] Client navigation and error recovery work.
- [ ] Routing behavior is documented and tested.
- [ ] Loader and action contracts are stable.
- [ ] Cache semantics are explicit and tested.
- [ ] User-specific data cannot leak through shared caches under supported configurations.
- [ ] Server-only modules cannot enter the browser graph unnoticed when their source is inspectable.
- [ ] Opaque dependencies have a documented policy.
- [ ] Production assets and manifests are reliable.
- [ ] Node.js deployment is fully documented.
- [ ] Static output works for supported applications.
- [ ] Browser tests cover complete production applications.
- [ ] Security tests and dependency audits pass.
- [ ] Benchmarks have reproducible baselines.
- [ ] Public API compatibility is documented.
- [ ] Clean CI installation and build succeed.
- [ ] Documentation matches the shipped implementation.
- [ ] Known limitations are published.
- [ ] At least several independently structured applications have been validated.

A passing unit test suite alone is insufficient evidence for a stable release.

---

# 23. Final product definition

Frost is a React-based full-stack framework built around explicit rendering, understandable caching, strict environment boundaries, observable builds and portable production deployment.

Its competitive advantage should not be the number of features it contains.

Its advantage should be that developers can understand what the framework is doing, predict the consequences of their code, debug production behavior and move between deployment environments without relying on hidden infrastructure assumptions.

The initial objective is not to outperform every competing framework in every benchmark. It is to deliver a smaller, dependable, well-documented foundation that can grow without compromising its core principles.

