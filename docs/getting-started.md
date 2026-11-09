# Getting started

> Create a Frost app, understand what the scaffold contains, run it in dev and production, and deploy it.

**Last verified against v0.1.1.**

## Prerequisites

- Node.js >= 20
- npm, pnpm, yarn, or bun
- Git (optional — the scaffolder runs `git init` for you)

## Create the app

```bash
npm create frost-app@latest my-app
cd my-app
npm install
npm run dev
```

`npm create frost-app` downloads `create-frost-app` and runs its bin. The default template is the full starter — the same app in `examples/starter` of this repo. Pass `--template minimal` for a tiny hand-written app instead.

Other flags: `--no-install`, `--no-git`, `--pm pnpm|npm|yarn|bun`, `--help`, `--version`.

Open `http://localhost:3000`.

## What the scaffold contains

```
my-app/
├── frost.config.ts          # framework config (port, security, seo, …)
├── postcss.config.mjs       # Tailwind via @tailwindcss/postcss
├── package.json             # scripts: dev, build, start, typecheck
├── tsconfig.json            # standalone — no monorepo extends
├── public/                  # static assets (favicon, frost marks)
└── src/
    ├── app/                 # file-based routes
    │   ├── layout.tsx       # root layout + its loader (nav data)
    │   ├── page.tsx         # / landing page
    │   ├── _middleware.ts   # runs before routing
    │   ├── error.tsx        # error boundary
    │   ├── not-found.tsx    # styled 404
    │   ├── playground/      # /playground client-state demo
    │   └── hello/[name]/    # /hello/:name contract-validated route
    ├── components/          # Header, Button, bento tiles, dialog
    ├── config/              # nav items, site metadata
    ├── data/                # shared server data helpers
    └── styles/app.css       # Tailwind theme tokens + imports
```

Routes are files: `src/app/about/page.tsx` → `/about`. See [file conventions](reference/file-conventions.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR, Fast Refresh, error overlay |
| `npm run build` | Production build into `.frost/` |
| `npm run start` | Serve the production build (Node) |
| `npm run typecheck` | `tsc --noEmit` |

The raw CLI (`frost`) also accepts `dev`, `build`, `start`, and `routes` with `--port`, `--host`, `--config`, `--analyze`, `--strict`. See [CLI reference](reference/cli.md).

## Verify the production build

```bash
npm run build
npm run start
```

`frost start` prints the real bound port and serves pre-compressed assets. In another terminal:

```bash
curl -s http://localhost:3000/ | head
curl -sI http://localhost:3000/ | grep -i "content-security\|x-content"
```

## Deploy

The simplest target is a Node host: build, then run `npm start` (or `node .frost/server/server-entry.js`) behind your platform's proxy. For edge/serverless, `createFetchAdapter` from `@frost.js/server` exposes the same handler as a Web `Request → Response` function. Full guide: [deployment](guides/deployment.md).

## Common mistakes

- **Port already in use** — pass `--port` or change `server.port` in `frost.config.ts`.
- **`process.env.MY_SECRET` in a component** — client code may only read `FROST_PUBLIC_*` variables; the build fails with `FROST_E_BOUNDARY`. See [environment variables](guides/environment-variables.md).
- **Editing `frost.config.ts` does nothing** — the dev server restarts automatically; if it doesn't, check the terminal for a config error.

## Related

- [Concepts](concepts.md) — the mental model
- [Architecture](architecture.md) — how the packages fit together
- [create-frost-app reference](reference/create-frost-app.md) — all flags and templates
