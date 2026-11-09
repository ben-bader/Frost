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

## Terminal UI

All commands share a branded terminal UI (logo header, `➜` info rows,
`◇` step/request lines, structured `┃` error blocks). Presentation flags:
`--no-color`, `--no-emoji`, `--ascii`, `--verbose`; env vars `NO_COLOR`,
`FORCE_COLOR`, `FROST_NO_EMOJI`, `FROST_ASCII`, `FROST_DEBUG`. Fallback
rules are documented in the [CLI reference](../reference/cli.md#terminal-output);
preview every frame with `pnpm cli:preview`.

## Key exports

| Export | Kind | Purpose |
|---|---|---|
| `devCommand`, `buildCommand`, `startCommand`, `routesCommand` | fns | Command implementations |
| `loadFrostConfig`, `mergeCliOverrides`, `findFrostConfigFile` | fns | Config loading for CLI use |
| `handler` (build command) | const | Internal prerender request handler |
| `cliVersion`, `projectName` | fns | Real version/app-name for the header |
| `serverUrls`, `envFileList`, `routeCounts`, `devRequestPrinter` | fns | URL derivation, env list, route counts, request lines |

## Related

- [CLI reference](../reference/cli.md) · [Configuration](../reference/configuration.md)
