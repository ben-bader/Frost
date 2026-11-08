# Layouts and metadata

## Layouts

`layout.tsx` files wrap every page in their directory subtree, root
first. A layout receives `{ data, params, children, actionData }` where
`data` is **its own** loader result (not the page's).

```tsx
export const loader = async () => ({ nav: NAV_ITEMS });

export default function RootLayout({ children, data }: Route.ComponentProps<LayoutData>) {
  return <Shell nav={data.nav}>{children}</Shell>;
}
```

Layout loaders, the page loader, and metadata resolution all run in
parallel. Metadata merges root→leaf with child values winning;
`titleTemplate` ("%s | App") applies to descendant titles.

## Metadata

Static object or function of `{ data, params, url }`:

```ts
export const metadata: Route.Metadata = {
  title: "Playground",
  description: "…",
  canonical: "https://example.com/playground",
  robots: "index, follow",
  openGraph: { title: "…", image: "/og.png", type: "website" },
  twitter: { card: "summary_large_image" },
  jsonLd: { "@context": "https://schema.org", "@type": "WebPage" },
};
```

`meta.scripts[].content` is escaped (`</script`, `<!--`) and requires a
nonce when CSP is enabled.

## SEO files

`frost build` emits `.frost/sitemap.xml` and `.frost/robots.txt` when
`seo.sitemap`/`seo.robots` are enabled (static routes only; dynamic
routes are skipped).
