# Environment variables

> `.env` loading, the `FROST_PUBLIC_*` client allowlist, and required-variable validation.

**Last verified against v0.1.1.**

## Loading

Frost loads `.env` files at startup — no dotenv dependency. Mode-aware order, later files win:

```
.env
.env.local
.env.[mode]
.env.[mode].local
```

`.local` files are git-ignored by convention. Standard `KEY=value` syntax; `#` comments and `export ` prefixes are tolerated.

## Server vs client

Only variables matching `env.publicPrefix` (default `FROST_PUBLIC_`) reach client bundles — the Vite plugin injects them via `define`. Everything else stays server-side.

```bash
# .env — server only (never shipped to the browser)
DATABASE_URL=postgres://…
STRIPE_SECRET_KEY=sk_live_…

# exposed to client code
FROST_PUBLIC_API_URL=https://api.example.com
```

In client code:

```ts
const apiUrl = process.env.FROST_PUBLIC_API_URL; // inlined at build time
```

Reading any other `process.env.*` from a client-reachable module fails the build with `FROST_E_BOUNDARY` — see [security](security.md).

## Required variables

Fail fast at startup when a variable is missing:

```ts
// frost.config.ts
import { defineConfig } from "@frost.js/vite";

export default defineConfig({
  env: { required: ["DATABASE_URL", "STRIPE_SECRET_KEY"] },
});
```

A missing var aborts `frost dev`/`build`/`start` naming the variable(s) — `FROST_E_ENV`.

## In loaders and actions

Server code reads `process.env` normally:

```ts
export const loader = async () => {
  const db = createDb(process.env.DATABASE_URL!);
  return { users: await db.users() };
};
```

## Common mistakes

- **`NEXT_PUBLIC_*`-style prefixes** — Frost's prefix is `FROST_PUBLIC_` by default; change it with `env.publicPrefix` if needed.
- **Secrets in `FROST_PUBLIC_*`** — anything with that prefix is public by definition.
- **Expecting `.env` changes to hot-reload** — restart the dev server after editing `.env`.

## Related

- [Security](security.md) · [Configuration](../reference/configuration.md)
