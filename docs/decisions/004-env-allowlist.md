# 004 — Client env allowlist

Context: `process.env.SECRET` in client code only failed at runtime in the browser (audit F11).

Options: ban all `process.env` in client code; allow `NODE_ENV` + `FROST_PUBLIC_*`; Vite `define` injection.

Decision: a `transform` hook in the Frost Vite plugin scans client-bound app modules (not `node_modules`, not SSR) for `process.env.X` / `process.env["X"]`. Only `NODE_ENV` and `FROST_PUBLIC_*` pass; anything else fails the build/dev transform with `FS1009` naming the variables.

Consequences: secrets cannot silently ship to the browser; public env vars need the documented prefix; dependency code is exempt (pre-bundled anyway) — app code is what matters.
