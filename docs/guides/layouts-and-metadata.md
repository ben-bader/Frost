# Layouts and metadata

> Nested layouts, layout loaders, `<head>` metadata, title templates, OG/Twitter, JSON-LD, and SEO files.

**Last verified against v0.1.1.**

## Layouts

`layout.tsx` files wrap every page in their directory subtree, root first. A layout is a route module like a page — it can export `loader`, `action`, `metadata`, `headers`, and `contract`.

```tsx
export const loader = async () => ({ nav: NAV_ITEMS });

export default function RootLayout({
  children,
  data,
}: Route.ComponentProps<LayoutData>): React.JSX.Element {
  return <Shell nav={data.nav}>{children}</Shell>;
}
```

- A layout's `data` prop is **its own** loader result, not the page's.
- Layout loaders, the page loader, and metadata resolution all run in parallel.
- `children` is the nested route content; `actionData` carries the nearest action result.

## Metadata

`metadata` is a static `Route.Metadata` object or a function of `{ data, params, url }`:

```ts
export const metadata: Route.Metadata = {
  title: "Playground",
  description: "…",
  canonical: "https://example.com/playground",
  robots: "index, follow",
  openGraph: { title: "…", image: "/og.png", type: "website", siteName: "My App" },
  twitter: { card: "summary_large_image" },
  jsonLd: { "@context": "https://schema.org", "@type": "WebPage" },
  meta: [{ name: "theme-color", content: "#0a1c1e" }],
};
```

| Field | Rendered as |
|---|---|
| `title` | `<title>` (merged with nearest `titleTemplate`) |
| `titleTemplate` | `"%s \| App"` applied to descendant titles; no `%s` → verbatim |
| `description` | `<meta name="description">` |
| `canonical` | `<link rel="canonical">` |
| `robots` | `<meta name="robots">` |
| `openGraph` / `twitter` | OG/Twitter meta tags |
| `jsonLd` | `<script type="application/ld+json">` (escaped) |
| `meta` / `links` / `scripts` | raw tag arrays; inline `scripts[].content` is `</script`/`<!--`-escaped and needs the CSP nonce |

Metadata merges root→leaf; child values win. `app.name`/`app.lang` in config supply defaults.

## SEO files

`frost build` emits `.frost/sitemap.xml` and `.frost/robots.txt` when enabled:

```ts
export default defineConfig({
  seo: { sitemap: true, robots: true, baseUrl: "https://example.com" },
});
```

Static routes only — dynamic routes are skipped. `baseUrl` is required for absolute sitemap URLs.

## Route headers

```ts
export const headers = { "Cache-Control": "public, max-age=60" };
// or a function of { request, params, url, context }
```

Applied to page responses after security headers.

## Common mistakes

- **Metadata in a client component** — `metadata` must be exported from the route module (server side).
- **Absolute `canonical` without `seo.baseUrl`** — provide the full URL yourself or set `baseUrl`.
- **Layout `data` confusion** — remember each layout sees only its own loader result.

## Related

- [Routing](routing.md) · [Data loading](data-loading.md)
