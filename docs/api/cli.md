# @frost.js/cli

> The `frost` command-line tool — dev, build, start, routes.

**Last verified against v0.1.1.** This package is a CLI; its programmatic exports mirror the command internals.

## Install

```bash
npm install -D @frost.js/cli
```

The scaffold adds `"dev": "frost dev"` etc. to `package.json`.

## Commands

`frost dev` · `frost build` (`--analyze`, `--strict`) · `frost start` · `frost routes` — see the full [CLI reference](../reference/cli.md).

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `devCommand`, `buildCommand`, `startCommand`, `routesCommand` | fns | Command implementations |
| `loadFrostConfig`, `mergeCliOverrides`, `findFrostConfigFile` | fns | Config loading for CLI use |
| `handler` (build command) | const | Internal prerender request handler |

## Related

- [CLI reference](../reference/cli.md) · [Configuration](../reference/configuration.md)
