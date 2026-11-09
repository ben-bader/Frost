# @frost.js/router

File-system route discovery, pattern compilation, and matching for [Frost](https://github.com/ben-bader/Frost).

The `frost` CLI and dev server use this internally. Import it directly to enumerate routes (`discoverRoutes`), match pathnames (`matchRoutes`), or generate route types in custom tooling.

## Install

```bash
npm install @frost.js/router
```

## Example

```ts
import { discoverRoutes, matchRoutes } from "@frost.js/router";

const routes = await discoverRoutes("src/app", "src/api");
const match = matchRoutes(routes, "/hello/world");
// match?.route.params → { name: "world" }
```

## Docs

[docs/api/router.md](https://github.com/ben-bader/Frost/blob/main/docs/api/router.md) · [Routing guide](https://github.com/ben-bader/Frost/blob/main/docs/guides/routing.md)
