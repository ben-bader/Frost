# 009 — Dev reload protocol and error channel

Context: dev had no structured reload/error channel; every change degraded
to Vite's default full reload, SSR-only edits might not reload at all, and
runtime errors only appeared in the terminal.

Options: (a) Vite `server.ws` custom events + injected dev client; (b) SSE
endpoint; (c) rely on Vite HMR alone.

Decision: (a). The watcher classifies changes and emits `frost:reload`,
`frost:css-update`, `frost:routes-changed`, `frost:error`,
`frost:error-clear` over `server.ws`; a small injected module
(`/@frost/dev-client`, dev only) renders the overlay and bumps stylesheet
links. SSR/API/.server edits force `frost:reload` because they have no client
importer; client components go through `@vitejs/plugin-react` Fast Refresh.
`frost.config.*` changes re-resolve config and call `server.restart()`, with
`reloadPending` + a ws connection hook so reconnected browsers reload once.

Consequences: one protocol for terminal + overlay; new dep
`@vitejs/plugin-react@^4.7.0` (MIT, ~small) in the CLI only; overlay and dev
client never ship to production builds.
