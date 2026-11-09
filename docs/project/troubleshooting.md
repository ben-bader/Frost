# Troubleshooting

> Windows-first fixes for the failures people actually hit. Last verified against v0.1.1.

## Windows

**Edits don't trigger reload**
The watcher uses native fs events. On some setups (network drives, WSL, certain AV configs) they don't fire. Enable polling:

```ts
// frost.config.ts
export default defineConfig({
  dev: { watch: { usePolling: true, interval: 100 } },
});
```

**`EADDRINUSE` / port already in use**
Another process holds the port — often an orphaned `frost dev`/`node` from a crashed terminal. Find and kill it:

```bash
netstat -ano | grep :3000        # find the PID
taskkill //PID <pid> //T //F     # Git Bash: double slashes
taskkill /PID <pid> /T /F       # cmd/PowerShell
```

Or pick another port: `frost dev --port 3001`.

**File locks after build (`EPERM`/`EBUSY` on `.frost/`)**
A running `frost start` or `node .frost/server/server-entry.js` holds the output. Stop it first; on Windows, `taskkill /T /F` kills the whole tree.

**CRLF/shebang errors running `frost` or `create-frost-app`**
`bin.js` files must be LF — if you edited them on Windows, ensure your editor didn't convert endings (`git config core.autocrlf` and `.gitattributes` enforce this in-repo; scaffolded projects get a standard `.gitignore` only).

## npm / publishing

**`npm create frost-app` → 404**
The unscoped `create-frost-app` package may not be published yet or your npm is hitting a stale mirror. Check:

```bash
npm view create-frost-app version
npm cache verify
```

If it shows only `0.0.0-stage`, the real version hasn't been published — use a local tarball meanwhile (`npm i ../release-tarballs/create-frost-app/create-frost-app-0.1.1.tgz`).

**Staged publish limbo**
npm staged publishing can leave a `0.0.0-stage` placeholder. Check `npm stage list`; approve with `npm stage approve <id>` or on npmjs.com → Staged Packages. Don't republish the same version.

**`npm whoami` → E401 mid-release**
Token expired or 2FA-restricted. Run `npm login` again.

## Terminal output

**Colors/Unicode look wrong in your terminal**
The CLI auto-detects color depth and Unicode support. Force behavior with
`--no-color` / `NO_COLOR` (no ANSI), `FORCE_COLOR=1|2|3` (16/256/truecolor),
`--no-emoji` / `FROST_NO_EMOJI=1`, or `--ascii` / `FROST_ASCII=1` (ASCII
symbols — also auto-enabled on legacy Windows consoles, `TERM=dumb`, and
non-UTF-8 locales). Piped/CI output never animates: each step prints once
as a finished line. Preview all variants with `pnpm cli:preview`.

**Error block shows no stack trace**
Stacks are hidden by default. Re-run with `--verbose` or `FROST_DEBUG=1`.

## Framework

**Overlay stuck after fixing the error**
Save any file to trigger a re-render — the overlay clears on the next successful render. `dev.overlay: false` disables it entirely.

**Hydration mismatch warnings in dev**
Enable `dev.checkDeterminism: true` to get a `FROST_E_HYDRATION` report naming the first differing line. Usual causes: `Date.now()`, `Math.random()`, `Math`/locale formatting, reading `window` during render.

**Loader changes don't reload**
Loader/action/API/`.server` module changes intentionally trigger a full reload (not Fast Refresh). If nothing happens, check the terminal for watcher errors and try polling.

**Contract 400s you didn't expect**
Route `contract` validates `params`, `search`, and bodies. A 400 `FROST_E_CONTRACT` means input failed the schema — check `formatContractIssues` output in the response/logs.

**`FROST_E_BOUNDARY` at build**
Client code imported a server-only module or read a non-`FROST_PUBLIC_*` env var. Move the code behind `"use client"` boundaries or rename the env var.

**Missing env var at startup**
`env.required` names the var in the error. Set it in the environment or a `.env` file — `.env` changes need a dev-server restart.

## Still stuck?

- `frost routes` — verify discovery sees your files
- `pnpm docs:check` / repo tests — confirm the checkout is healthy
- [Manual tests](../MANUAL_TESTS.md) — the browser checklist we run before releases
