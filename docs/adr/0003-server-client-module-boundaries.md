# ADR 0003: Server/Client Module Boundaries and AST Enforcement

## Status
Accepted

## Context
Accidental inclusion of server code (database clients, private encryption keys, internal service credentials) in client bundles is one of the most critical security vulnerabilities in modern full-stack frameworks.

## Decision
1. **Three Module Categories:**
   - **Universal Modules (`*.ts`, `*.tsx`):** Pure functions, shared schemas, types, UI components without privileged access. Safe in both environments.
   - **Server-Only Modules (`*.server.ts`, `*.server.tsx`, or modules importing `@frostjs/server/only`):** Privileged code, database connectors, secret handlers. Forbidden in client bundles.
   - **Client-Only Modules (`*.client.ts`, `*.client.tsx`, or containing `"use client"`):** Browser-only APIs (`window`, `localStorage`, canvas). Excluded from SSR execution if required.
2. **Build-Time AST Graph Analysis:**
   - The `@frostjs/vite` plugin hooks into Rollup's module resolution (`resolveId` and `transform`).
   - If a client entry or any of its transitive dependencies attempts to import a `.server.ts` module or a known server package (e.g., `fs`, `node:crypto`, `child_process`, database drivers), the build fails immediately with error code `FS1004` and prints the full importer chain.
3. **Secret Environment Variable Isolation:**
   - Only variables explicitly prefixed with `FROST_PUBLIC_` are exposed to the client bundle (`import.meta.env.FROST_PUBLIC_*`).
   - All other environment variables throw or evaluate to `undefined` if accessed in client code.

## Consequences
- **Positive:**
  - Absolute compile-time guarantee against leaking server credentials to browser assets.
  - Clear error diagnostics indicating the exact file import chain that caused the violation.
- **Negative:**
  - Developers must be disciplined with file naming (`.server.ts`) or export structures when writing shared and backend utilities.
