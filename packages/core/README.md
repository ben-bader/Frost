# @frost.js/core

Core configuration, contracts, diagnostics, env loading, logging, and shared types for [Frost](https://github.com/ben-bader/Frost).

You rarely import this directly — `@frost.js/vite`, `@frost.js/server`, and `@frost.js/data` re-export what you need. Import it for `FrostConfig`/`defineConfig` typing, `FrostError`, contract helpers, or response helpers (`json`, `redirect`, `html`).

## Install

```bash
npm install @frost.js/core
```

## Example

```ts
import { defineConfig } from "@frost.js/core";

export default defineConfig({
  app: { name: "My App" },
  env: { required: ["DATABASE_URL"] },
});
```

## Docs

Full export reference: [docs/api/core.md](https://github.com/ben-bader/Frost/blob/main/docs/api/core.md) · [Configuration](https://github.com/ben-bader/Frost/blob/main/docs/reference/configuration.md)
