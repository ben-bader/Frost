# 010 — Layout data, error boundaries, not-found, metadata merge

Context: layout loader/action/metadata were silently ignored (F3); 404/500
were bare HTML (F13); no custom error pages existed.

Options: (a) Next.js-style per-segment error.tsx with truncated layout
chains; (b) error boundary renders inside the route's full layout chain;
(c) separate _error/_404 files.

Decision: `error.tsx`/`_error.tsx` per directory, nearest wins, rendered
inside the route's full layout chain with each layout's own loader data;
`not-found.tsx`/`_404.tsx` at app root rendered inside the root layout.
Layout loaders run in parallel with the route loader (Promise.allSettled,
route failure wins ties); metadata merges root->leaf, child wins,
`titleTemplate` ("%s") applies nearest-ancestor-first. Layout `action` is
the fallback when a page has none. Form POSTs (Accept: text/html) re-render
with `actionData`; fetch clients get JSON.

Consequences: layout loader data is serialized as `layoutData[]` in
`__FROST_DATA__` so hydration matches SSR. Nested not-found files are
ignored (documented). Error boundaries don't catch errors in layouts above
the failing segment.
