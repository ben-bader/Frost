# FAQ

> Short answers. Last verified against v0.1.1.

**Is Frost production-ready?**
Core paths (routing, loaders, actions, contracts, middleware, streaming SSR, Node adapter, dev server) are tested and exercised by the starter. It's 0.1.x — the API may change before 1.0. See the [status alert](../../README.md) in the README.

**Does Frost do React Server Components?**
No. The boundary model is explicit `"use client"` islands: everything is server-rendered unless a module opts into the client. See [architecture](../architecture.md).

**How do I add auth?**
In `app/_middleware.ts` (redirect/short-circuit) or a layout loader (load user into context). Frost ships no auth system — see [security](../guides/security.md).

**Static site generation?**
Not yet — SSR is always-on. SSG/ISR is on the [roadmap](roadmap.md).

**Which package manager?**
All of them — `npm create frost-app`, `pnpm create frost-app`, `yarn create frost-app`, `bun create frost-app`.

**Minimum Node version?**
Check each package's `engines` — the repo targets modern Node (v22+). The CLI requires Node ≥22.14 for `npm stage` workflows during releases.

**Where do env vars go?**
`.env` files at the project root; `FROST_PUBLIC_*` reaches the client, everything else stays server-side. See [environment variables](../guides/environment-variables.md).

**How do I deploy?**
`frost build && frost start` on Node, Docker via the [Dockerfile](../guides/deployment.md), or `createFetchAdapter` on edge runtimes.

**Type-safe routes?**
Generated route types in `.frost/types/` power typed `<Link>`; route `contract`s add runtime validation of params/search/bodies. See [contracts](../guides/contracts-and-types.md).

**The overlay won't go away**
Save any file — it clears on the next successful render. Disable with `dev.overlay: false`.

**Where's the full option list?**
[Configuration reference](../reference/configuration.md).

## Related

- [Troubleshooting](troubleshooting.md) · [Glossary](glossary.md)
