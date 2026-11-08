# 008 — Dev route/CSS caching

Context: every dev request ran a recursive route scan plus a module-graph CSS walk (audit F5).

Options: cache forever; per-request discovery (status quo); watcher-invalidated cache.

Decision: cache `discoverRoutes` and the per-route CSS list; invalidate via `server.watcher` "all" events debounced 50ms. Route cache clears only for files inside `appDirectory`/`apiDirectory`; CSS cache clears for any in-project change. Watch ignores `node_modules`, `.git`, `.frost`, `dist`; `dev.watch.usePolling` remains an opt-in fallback.

Consequences: warm dev requests skip all fs scanning; new/removed routes appear on the next request after the debounce; atomic-save bursts coalesce into one invalidation.
