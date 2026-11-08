# Client router (opt-in)

Disabled by default — Frost navigates by full document loads. Enable:

```ts
// frost.config.ts
export default defineConfig({
  router: { enabled: true, prefetch: "intent" }, // intent | viewport | none
});
```

With the router on:

- `<Link>`/same-origin `<a>` clicks are intercepted (modifier keys,
  `target`, `download`, external `rel` are respected).
- Navigation fetches the same path with `?__frost_data=1` (loader data + route manifest)
  and lazy route chunks, then swaps the tree inside `startTransition`.
- Scroll restoration, focus management, and `popstate` (back/forward)
  are handled; prefetch fires on hover/focus or viewport per config.
- **Any failure falls back to a full document navigation.**
- `usePathname()` reads router context, not `window.location`.
