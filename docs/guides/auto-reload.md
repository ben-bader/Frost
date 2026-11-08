# Auto reload & dev experience

The Vite watcher is the single source of change events (debounced ~50 ms,
atomic-save bursts coalesced). Every change is classified and pushed over
`server.ws` with the `frost:*` protocol:

| Change | Event | Effect |
| --- | --- | --- |
| Route file added/removed | `frost:routes-changed` → `frost:reload` | route table rebuilt, full reload |
| Loader/action/API/`.server` module | invalidate SSR modules → `frost:reload` | full reload |
| Component (refreshable) | Vite HMR / Fast Refresh | state preserved |
| Non-component module | `frost:reload` | full reload (reason logged) |
| CSS | style hot update | no reload |
| `frost.config.ts` | in-process restart | reload when back on same port |

The browser client reconnects with backoff after a dev-server restart
and reloads once — idle clients show nothing. `dev.watch.usePolling`
is available as a fallback (e.g. some Windows/network drives).

`packages/*` changes require `pnpm build` in that package (workspace
deps resolve to `dist/`); `--watch-packages` can keep them rebuilt.
