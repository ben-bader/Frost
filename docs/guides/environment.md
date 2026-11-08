# Environment variables

Frost loads `.env` files at startup (no dotenv dependency) in
mode-aware order: `.env`, `.env.local`, `.env.[mode]`,
`.env.[mode].local` — later files win, `.local` is git-ignored by
convention.

## Public variables

Only variables matching `env.publicPrefix` (default `FROST_PUBLIC_`) are
exposed to client bundles, via Vite `define`. Reading any other
`process.env.*` in client code fails the build with `FROST_E_BOUNDARY`
(Phase 1 client-boundary guard).

## Required variables

```ts
// frost.config.ts
export default defineConfig({
  env: {
    required: ["DATABASE_URL", "STRIPE_SECRET_KEY"],
  },
});
```

Missing required vars fail fast at startup naming the variables.
Server-side code reads `process.env` normally inside loaders/actions.
