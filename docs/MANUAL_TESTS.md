# Manual browser tests

Checks that require a real browser. Run `pnpm --filter examples/starter dev`
(or `frost dev` in `examples/starter`) and verify each item. No automated
browser tooling is used in this repo.

## Dev experience (Phase 3)

1. **CSS hot update** — edit `examples/starter/src/styles/app.css`, save.
   Expected: styles update without a page reload (no flash, scroll/focus kept).
2. **Fast Refresh** — edit a component file (e.g. `src/components/Counter.tsx`),
   save. Expected: component updates and React state (e.g. counter value) is
   preserved. Editing a file that exports a loader/action/non-component falls
   back to a full reload (check the terminal for the reason).
3. **Server module reload** — edit a file only imported by loaders/actions or
   an API route. Expected: full page reload.
4. **Route add/remove** — add `src/app/tmp-route/page.tsx`. Expected: page
   reloads and `/tmp-route` works; delete it, same in reverse.
5. **Error overlay** — temporarily make a loader throw. Expected: styled
   Frost overlay (red border, danger icon) with name/message/code/route/
   runtime/location, Copy details + Dismiss buttons, Escape closes, backdrop
   click closes. Terminal shows the matching `ERROR` block.
6. **Overlay clears** — fix the loader and reload/save. Expected: overlay
   disappears on the next successful render.
7. **Config restart** — edit `frost.config.ts` (e.g. change a comment).
   Expected: terminal prints "frost.config changed — restarting dev server…",
   the page reloads automatically once the server is back, same port.
8. **Determinism check** — set `dev.checkDeterminism: true` in
   `frost.config.ts`, add `Date.now()` to a component render. Expected: WARN
   block in terminal and a warning overlay after reload.

## Later phases (fill in as features land)

- Hydration correctness (no React #418 warnings in console).
- Client router navigation (scroll/focus restoration, popstate, prefetch).
- Streaming SSR (shell arrives before deferred content).
