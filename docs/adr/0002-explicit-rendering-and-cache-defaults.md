# ADR 0002: Explicit Rendering Modes and Opt-In Cache Semantics

## Status
Accepted

## Context
Implicit caching and heuristic rendering decisions create difficult bugs in full-stack applications:
- Developers cannot easily tell whether dynamic request data or secrets are cached across users.
- Subtly touching `cookies()` or `headers()` can suddenly turn a static route into a dynamic route or break builds without warning.
- Cache invalidation is hard to reason about when caching is globally implicit.

## Decision
1. **Four Explicit Rendering Modes:**
   - `static`: Pre-rendered at build time. Request-specific cookies/headers are disallowed.
   - `server`: Rendered dynamically on each incoming request.
   - `incremental`: Stale-while-revalidate cached HTML with explicit TTL and tag invalidation.
   - `client`: Client-only rendering with lightweight HTML shell.
2. **Opt-In Caching Default:**
   - Application data and loaders are uncached by default (`no-store`).
   - Caching requires an explicit `frost.cache(key, fn, { ttl, tags })` call or route rendering declaration.
   - Multi-tenant and user-authenticated data cannot enter a shared cache unless tenant and user identity keys are explicitly provided in the cache key.
3. **Rendering Ledger:**
   - Every route produces an inspectable JSON ledger during build and runtime logging its rendering mode, dependencies, cache policy, and dynamic inputs.

## Consequences
- **Positive:**
  - Predictable execution: no unexpected stale data or cross-user data leakage.
  - Transparent debugging via the Cache Inspector and Rendering Ledger.
- **Negative:**
  - Developers must intentionally define cache keys and TTLs for high-traffic public pages instead of relying on automatic framework heuristics.

