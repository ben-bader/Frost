# Roadmap

> What's next, what's later, what's being explored. Nothing on this page is implemented unless linked to a stable doc.

**Last verified against v0.1.1.**

## Next

- **1.0 stabilization** — the API is expected to keep moving until 1.0; watch the changelog and [upgrading](../guides/upgrading.md).
- **More host adapters** — the `FrostAdapter` contract is stable and `createFetchAdapter` covers edge runtimes, but first-class adapters for Vercel/Netlify/Cloudflare-style platforms are planned. See [deployment](../guides/deployment.md).

## Later

- **Static generation (SSG/ISR)** — build-time prerendering and incremental revalidation. Explicitly *not* in 0.1.x; SSR is always-on today.
- **RSC evaluation** — React Server Components are not implemented; the `"use client"` island model is the current boundary. Whether RSC semantics are adopted is an open design question, not a commitment.

## Exploring

- Image optimization pipeline
- Internationalization (i18n) routing
- Partial prerendering (PPR)
- View transitions API integration

## Not planned (unless demand appears)

- A `frost deploy` hosting CLI — deployment is adapter + your platform.
- A plugin marketplace — the extension surface today is config, middleware, and route modules.

## Related

- [Comparison](comparison.md) — where alternatives are stronger today
