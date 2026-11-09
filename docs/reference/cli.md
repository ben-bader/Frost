# CLI reference

> `@frost.js/cli` — `frost` commands, flags, and exit behavior. Verified against `packages/cli/src/bin.ts`.

**Last verified against v0.1.1.**

## Commands

| Command | What it does |
|---|---|
| `frost dev` | Start the dev server (Vite + watcher + HMR) |
| `frost build` | Production build into `.frost/` |
| `frost start` | Serve the production build with the Node adapter |
| `frost routes` | List discovered routes |
| `frost --help` / `-h` | Print usage |

No arguments (or an unknown command) prints the usage text.

## Global flags

| Flag | Applies to | Description |
|---|---|---|
| `--port`, `-p <n>` | dev, start | Port (overrides config) |
| `--host`, `-h <host>` | dev, start | Bind host (overrides config) |
| `--config <path>` | all | Path to `frost.config.{ts,js,mjs}` |
| `--analyze` | build | Print per-route client bundle sizes (raw + gzip) |
| `--strict` | build | Fail when `budgets.clientJsKb` is exceeded |
| `--no-color` | all | Disable all ANSI colors (also `NO_COLOR`) |
| `--no-emoji` | all | Remove emoji from output (also `FROST_NO_EMOJI=1`) |
| `--ascii` | all | ASCII symbols instead of Unicode box drawing (also `FROST_ASCII=1`) |
| `--verbose` | all | Print stack traces with errors (also `FROST_DEBUG=1`) |

## Behavior notes

- `frost.config.*` is loaded for every command; a missing file falls back to defaults, a broken file fails fast naming the path.
- `.env` files load before each command (`development` mode for `dev`, `production` otherwise); missing `env.required` vars abort with `Missing required environment variable(s): …` and exit 1.
- Uncaught errors print a structured error block (rail, `ERROR` badge, code/at/route/runtime rows, optional code frame) and exit 1. Stack traces stay hidden unless `--verbose` or `FROST_DEBUG=1` is set.
- `dev`/`start` are long-running; `build`/`routes` exit when done.

## Terminal output

`dev`, `build`, `start`, and `routes` share one branded header: the Frost
logo block, `Frost <version>` (the installed `@frost.js/cli` version), the
project name from its `package.json`, then `➜` rows for `Local`/`Network`
URLs (real bound address only — `Network` appears solely when the server
binds beyond localhost), `Routes` counts from the real route table, `Env`
files that were actually loaded, and `Watching for changes` (dev only),
followed by a real `Ready in <ms>` measurement. In `dev`, one `◇` request
line per request prints only when `logging.requestLogs` is enabled;
asset requests are skipped.

Colors use truecolor (falling back to 256-color, then 16-color, then none)
through a single palette: mint for rails/success/2xx, deep teal for the
logo's third row, underlined sky blue for URLs only, bold white for
commands/values, dim for labels/durations, amber for warnings/4xx, red for
errors/5xx. `pnpm cli:preview` renders every frame with fake data.

### Terminal fallbacks

| Condition | Behavior |
|---|---|
| `NO_COLOR` set or `--no-color` | No ANSI at all |
| `FORCE_COLOR=1/2/3` | Force 16/256/truecolor regardless of TTY |
| stdout not a TTY | No spinner or cursor control; each step prints once as a finished line |
| `--no-emoji` or `FROST_NO_EMOJI=1` | Emoji removed (with their spacing) |
| `--ascii` or `FROST_ASCII=1`, `TERM=dumb`, non-UTF-8 locale, legacy Windows console | ASCII symbol map (`▰`→`#`, `◇`→`*`, box chars→`+`/`-`/`|`) and emoji dropped |
| Terminal under 60 columns | Logo hidden, paths ellipsized from the left, boxes shrink to fit |

## Examples

```bash
frost dev --port 4000
frost build --analyze
frost build --strict
frost start -p 8080
frost routes
```

## Package scripts

The scaffold wires these in `package.json`:

```json
{
  "dev": "frost dev",
  "build": "frost build",
  "start": "frost start",
  "typecheck": "tsc --noEmit"
}
```

## Related

- [Configuration](configuration.md) · [Dev server](../guides/dev-server.md) · [Deployment](../guides/deployment.md)
