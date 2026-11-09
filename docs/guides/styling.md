# Styling

> CSS delivery, Tailwind, per-route stylesheets, and font loading.

**Last verified against v0.1.1.**

## How CSS works

Stylesheets are discovered per route and emitted as real `<link rel="stylesheet">` tags in the server-rendered `<head>` — before first paint and independent of hydration. There is no flash of unstyled content and no layout shift from late-loading CSS.

- **Development:** the Vite plugin walks each route's module graph (page + layout chain) for CSS imports and serves compiled CSS through `/@frost/css?url=...`. Vite HMR continues to work — editing CSS hot-updates without a reload.
- **Production:** `frost build` emits a client bundle per route plus a manifest; the server resolves each route's CSS and JS from the manifest and renders hashed asset URLs. Font files emitted by `@fontsource` are referenced from the stylesheet, and primary weights are preloaded with `crossorigin`.

Import CSS anywhere in the route's module graph — conventionally in the root layout:

```tsx
// src/app/layout.tsx
import "../styles/app.css";
```

## Tailwind

The scaffold uses Tailwind CSS v4 via `@tailwindcss/postcss` (`postcss.config.mjs`):

```js
// postcss.config.mjs
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

```css
/* src/styles/app.css */
@import "tailwindcss";

@theme {
  --color-mint: #10e8c8;
  --font-sans: "Space Grotesk", system-ui, sans-serif;
}
```

`@theme` tokens become utilities (`bg-mint`, `text-ink-hi`) and CSS variables. Any PostCSS setup works — Frost only requires that CSS be importable from the module graph.

## Fonts

The starter uses `@fontsource/space-grotesk` and `@fontsource/space-mono`, imported at the top of `app.css`. Because fonts arrive via the stylesheet (not `<link>` tags you manage), they get preloaded automatically in production.

## Common mistakes

- **Global CSS imported only in a leaf page** — it still works (per-route CSS graph), but shared chrome styles belong in the root layout so every route gets them.
- **Expecting CSS modules** — plain CSS/Tailwind is the convention; CSS modules work through Vite but aren't part of the Frost contract.
- **Inline `<style>` in components** — works, but bypasses the pre-paint stylesheet pipeline; prefer the CSS graph for anything above the fold.

## Related

- [Performance](performance.md) — modulepreload and font preloads
- [Getting started](../getting-started.md) — what the scaffold ships
