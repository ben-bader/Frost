# Frost Threat Model & Security Architecture

This document identifies security boundaries, threat vectors, mitigations, and non-goals for Frost.

---

## 1. Trust Boundaries

1. **Client Browser vs Server Runtime:**
   - Code running in the browser is completely untrusted.
   - Any server function or route action exposed via HTTP is considered a public API endpoint.
   - Client code must never receive server secrets or private configuration.
2. **Multi-Tenant / Multi-User Isolation:**
   - In-memory shared caches must never share data across tenants or users without explicit tenant/user partitioning in the cache key.
   - Loader and Action parameters are untrusted user input and must be validated.
3. **Build Graph Boundary:**
   - Build-time dependency analysis must prevent `.server.ts` or Node-native built-ins from being bundled into client chunks.

---

## 2. Threat Analysis & Mitigations

| Threat ID | Threat Description | Attack Vector | Mitigation in Frost |
|---|---|---|---|
| **TH-01** | Server Secret Leakage | Developer imports a database config or uses `process.env.SECRET` in a component that is bundled for the browser. | AST analysis in `@frostjs/vite` rejects `.server.*` imports into client entries with code `FS1004`. Build env injector only exposes `FROST_PUBLIC_*`. |
| **TH-02** | Cross-User Cache Contamination | Route returns authenticated user profile and gets cached into a shared CDN or in-memory application cache. | Frost caches are `no-store` by default. Caching is opt-in. Routes with `cookies()` or session access require explicit user-scoped cache keys. |
| **TH-03** | CSRF (Cross-Site Request Forgery) | An external origin submits a mutation `POST` request to a Frost `action()`. | Automatic CSRF token validation or `Origin`/`Sec-Fetch-Site` header verification on mutation requests with cookies. |
| **TH-04** | Parameter Injection / Over-posting | Malicious JSON payload with prototype pollution or unauthorized fields sent to an action. | Form/JSON parser enforces body size limits (`1MB` default) and validates keys against structured schemas. |
| **TH-05** | Denial of Service via Large Payloads | Attacker sends infinite stream or multi-gigabyte body to an API route. | Body stream limits strictly enforced at the adapter layer before buffering into memory. |
| **TH-06** | Information Disclosure in Error Messages | Database connection strings, SQL queries, or stack traces rendered in 500 HTML responses. | Production error boundary strips internal stack traces and server-side errors, returning generic error codes while logging full details securely to server logs. |
| **TH-07** | Client-Side Hydration Tampering | Attacker tampers with `window.__FROST_DATA__` embedded in the HTML before React hydrates. | Embedded JSON data is escaped against `</script>` injection and treated purely as initial UI state; subsequent mutations must re-verify authorization on the server. |

---

## 3. Explicit Non-Goals

- Frost does not replace database-level Row Level Security (RLS) or application authorization layers; developers must check user permissions inside loaders and actions.
- Frost does not ship a custom cryptography library; all hashing and session token generation rely on Node's standard `node:crypto` or Web Crypto API.

