# Route contracts

Contracts validate params, search params, loader returns, action input,
and header exports at runtime using the **Standard Schema** interface —
zod, valibot, arktype, or any `~standard` validator works without Frost
depending on them.

```ts
import { z } from "zod"; // or valibot, arktype, …

export const contract = {
  params: z.object({ id: z.string().uuid() }),
  search: z.object({ q: z.string().optional() }),
  loader: z.object({ title: z.string() }),   // validates loader return
  action: z.object({ name: z.string() }),    // validates action input
  headers: z.record(z.string(), z.string()),
};
```

## Behavior

- Invalid `params`/`search` → **400** (API) or the route's error
  boundary (pages), reported as `FROST_E_CONTRACT`.
- Loader return violations → typed `FROST_E_CONTRACT` error with the
  field path, surfaced through the error boundary/overlay.
- Validation runs in **dev always**; in production only when
  `contracts.validateInProduction: true`.

## defineRoute

`defineRoute()` from `@frostjs/core` gives inferred types for loader
data, params, and action input so components receive typed `data`
instead of `any`. `frost build`/`dev` also emit `.frost/types/routes.d.ts`
for typed `Link` hrefs — include it in `tsconfig.json` `include`.

`frost routes` prints each route's contract/layout/loader/action status.
