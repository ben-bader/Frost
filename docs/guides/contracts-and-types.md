# Contracts and types

> Runtime validation with Standard Schema, `defineRoute()` inference, and generated route types.

**Last verified against v0.1.1.**

## Route contracts

A route module may export `contract` — a runtime spec for its untrusted inputs and outputs, expressed with the **Standard Schema** interface. zod, valibot, arktype, or any `~standard` validator works; Frost does not depend on any of them.

```ts
import { z } from "zod"; // or valibot, arktype, a hand-rolled ~standard

export const contract = {
  params: z.object({ id: z.string().uuid() }),
  search: z.object({ q: z.string().optional() }),
  loader: z.object({ title: z.string() }),   // validates loader return
  action: z.object({ name: z.string() }),    // validates action input
  headers: z.record(z.string(), z.string()),
};
```

`RouteContract` fields (all optional): `params`, `search`, `loader`, `action`, `headers`. API routes support `params` and `search`.

## Validation behavior

| Input | Where validated | Failure |
|---|---|---|
| `params` | Route match | 400 (API) / error boundary (page), `FROST_E_CONTRACT` |
| `search` | Route match | same |
| `loader` return | After loader runs | `FROST_E_CONTRACT` via error boundary/overlay |
| `action` input | Before action runs | 400 `FROST_E_CONTRACT` |
| `headers` | Before response | `FROST_E_CONTRACT` |

Validation runs **always in dev** and in production only when `contracts.validateInProduction: true` (default `false` — contracts are a dev-time guard unless you opt in).

The starter ships a minimal hand-rolled `StandardSchemaV1` in `src/app/hello/[name]/page.tsx` — copy that pattern if you don't want a validator dependency.

## defineRoute

`defineRoute()` from `@frost.js/core` gives route modules inferred types instead of `any`:

```ts
import { defineRoute } from "@frost.js/core";

export default defineRoute({
  loader: async ({ params }: { params: { name: string } }) => ({ name: params.name }),
  component: ({ data }) => <h1>{data.name}</h1>, // data is typed
});
```

## Generated route types

`frost dev`/`frost build` emit `.frost/types/routes.d.ts` — an ambient route map that types `Link`'s `to`/`href` props. Include it in `tsconfig.json`:

```json
{ "include": ["src/**/*", ".frost/types/**/*"] }
```

The scaffold's generated `tsconfig.json` already includes it.

## Inspect contracts

```bash
frost routes
```

prints each route's contract/layout/loader/action status.

## Common mistakes

- **Validating in the component** — contracts run on the server before render; components receive already-validated data.
- **Forgetting `validateInProduction`** — dev catches contract violations; production skips them by default. Enable it for money/auth paths.
- **Non-JSON loader returns under a `loader` contract** — the schema validates the serialized value; keep contracts aligned with what crosses the wire.

## Related

- [Data loading](data-loading.md) · [Error codes](../reference/error-codes.md)
