# @frost.js/router

> File-system route discovery, pattern compilation, and matching.

**Last verified against v0.1.1.**

## Install

```bash
npm install @frost.js/router
```

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `discoverRoutes(appDir, apiDir, options?)` | fn | Scan directories → `DiscoveredRoute[]` |
| `matchRoutes(routes, pathname)` | fn | Match a pathname → `RouteMatch` |
| `compilePattern(pattern)` | fn | Compile a route pattern to a matcher |
| `filePathToPattern(relPath)` | fn | `page.tsx` path → URL pattern + params spec |
| `normalizePathname(pathname)` | fn | Canonicalize a URL pathname |
| `decodePathname(pathname)` | fn | Decode percent-escapes safely |
| `generateRoutesModuleCode(routes)` | fn | Emit the virtual routes module source |
| `routeTypesDeclaration(routes)` | fn | Emit generated `.d.ts` route types |
| `DiscoveredRoute`, `RouteMatch`, `RouteKind`, `DiscoverOptions` | types | Discovery/match types |

## Notes

- `discoverRoutes` is what `frost routes` and the dev server call; route kinds are `page | layout | api | not-found | middleware`.
- Generated route types power typed `<Link>`/contracts — see [contracts and types](../guides/contracts-and-types.md).

## Related

- [Routing](../guides/routing.md) · [File conventions](../reference/file-conventions.md)
