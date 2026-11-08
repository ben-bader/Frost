# 001 — frost.config loading

Context: `frost.config.ts` existed but no command ever loaded it (audit F1).

Options: jiti (new dep), Vite `loadConfigFromFile` (already a dep), custom esbuild bundle.

Decision: use Vite's `loadConfigFromFile` in `packages/cli/src/config.ts`. It bundles TS/ESM/CJS configs with esbuild and is already in the dependency tree. Search order: `--config <path>`, then `frost.config.{ts,js,mjs}` in the project root. CLI `--port`/`--host` flags override file values.

Consequences: zero new dependencies; config authors get TS support for free; config functions/promises are not supported (object export only).
