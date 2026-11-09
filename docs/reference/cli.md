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

## Behavior notes

- `frost.config.*` is loaded for every command; a missing file falls back to defaults, a broken file fails fast naming the path.
- `.env` files load before each command (`development` mode for `dev`, `production` otherwise); missing `env.required` vars abort with `Missing required environment variable(s): …` and exit 1.
- Uncaught errors print `❌ CLI Error: <message>` and exit 1.
- `dev`/`start` are long-running; `build`/`routes` exit when done.

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
