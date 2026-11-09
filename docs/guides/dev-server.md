# Dev server

> Auto reload, Fast Refresh, the `frost:*` protocol, error overlay, config restart, and Windows file-watching notes.

**Last verified against v0.1.1.**

## What happens on file save

The Vite watcher is the single source of change events (debounced ~50 ms; atomic-save bursts coalesce). Every change is classified and pushed to the browser over `server.ws` with the `frost:*` protocol:

| Change | Event | Effect |
|---|---|---|
| Route file added/removed | `frost:routes-changed` → `frost:reload` | route table rebuilt, full reload |
| Loader/action/API/`.server` module | invalidate SSR modules → `frost:reload` | full reload |
| Component (refreshable) | Vite HMR / Fast Refresh | state preserved |
| Non-component module | `frost:reload` | full reload (reason logged) |
| CSS | style hot update | no reload |
| `frost.config.ts` | in-process restart | reload when back on same port |

## Fast Refresh

Component edits preserve React state — the counter on `/playground` keeps its value across saves. Files that export loaders, actions, or non-component values fall back to a full reload; the terminal logs the reason.

## Error overlay

Server render/loader/API/middleware errors produce a styled overlay in the browser (`role="alertdialog"`: error name, message, code, file:line:column, code frame, meta grid, suggested fix, Copy details, Dismiss) **and** a matching terminal `ERROR` block — both rendered from one `FrostErrorReport`. The overlay clears on the next successful render. `dev.overlay: false` disables it.

## Config restart

Editing `frost.config.ts` restarts the dev server in-process — no manual restart. The terminal prints a restart notice and the page reloads once the server is back on the same port. Browser clients reconnect with backoff after a restart.

## Determinism check

`dev.checkDeterminism: true` renders each route twice per request and emits a `WARN` report (`FROST_E_HYDRATION`) on nondeterministic output — typical culprits: `Date.now()`, `Math.random()`, locale formatting. Dev-only; never affects production.

## File watching on Windows

Native fs events are used by default. If changes are not detected (some Windows setups, network drives, WSL), enable polling:

```ts
export default defineConfig({
  dev: { watch: { usePolling: true, interval: 100 } },
});
```

`interval` is in milliseconds.

## Package changes while hacking on Frost

Workspace packages resolve to `dist/` — after editing `packages/*`, run `pnpm build` in that package (or use `--watch-packages` where supported) for the starter to pick it up.

## Troubleshooting

- **Edits don't reload** — check the terminal for watcher errors; try `usePolling`.
- **Overlay stuck after fix** — save any file to trigger a re-render; the overlay clears on the next successful render.
- **Port conflict on restart** — `frost dev --port <n>` or `server.port` in config.

## Related

- [Auto reload decision record](../decisions/009-dev-reload-protocol.md) · [Error handling](error-handling.md)
