# @frost.js/vite

The Vite plugin for [Frost](https://github.com/ben-bader/Frost): dev server with the `frost:*` reload protocol, Fast Refresh, the server/client boundary transform, per-route CSS, and the production build pipeline.

Every Frost app uses it through `frost.config.ts` and the `frost` CLI — import `frost`/`defineConfig` directly only for custom Vite setups.

## Install

```bash
npm install @frost.js/vite
```

## Example

```ts
// frost.config.ts
import { defineConfig } from "@frost.js/vite";

export default defineConfig({
  server: { port: 3000 },
  security: { cspMode: "enforce" },
});
```

## Docs

[docs/api/vite.md](https://github.com/ben-bader/Frost/blob/main/docs/api/vite.md) · [Dev server](https://github.com/ben-bader/Frost/blob/main/docs/guides/dev-server.md) · [Configuration](https://github.com/ben-bader/Frost/blob/main/docs/reference/configuration.md)
