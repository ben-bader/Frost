# Releasing Frost

This runbook covers the **first** npm release (all packages at `0.1.0`)
and every release after it. Written for Windows + Git Bash; everything
also works in Linux/macOS terminals.

Published packages, in dependency order (leaf first):

1. `@frost.js/core`
2. `@frost.js/router`
3. `@frost.js/data`
4. `@frost.js/react`
5. `@frost.js/server`
6. `@frost.js/adapter-node`
7. `@frost.js/vite`
8. `@frost.js/test`
9. `@frost.js/cli`
10. `create-frost-app` (last — it scaffolds apps that consume the rest)

---

## 1. Prerequisites

- An npmjs.com account with **2FA enabled** (publish will prompt for it).
- Membership in the `frost.js` npm organization (or ownership of the
  `@frost.js` scope).
- Node.js >= 20 and the repo's pinned pnpm (`corepack enable` or
  `npm i -g pnpm@12.16.1`).
- Verify auth works:

  ```bash
  npm whoami
  ```

## 2. First manual publish (one time)

Trusted publishing (OIDC) cannot create a package that does not exist
yet, so the very first publish of each package must be done by hand.

From the repo root on `frost-hardening` (or `main` after merge):

```bash
pnpm install --frozen-lockfile
pnpm release:pack        # builds + packs everything into ./release-tarballs/
```

Then publish **in this exact order** — each command will prompt for
your 2FA code:

```bash
npm publish release-tarballs/core/frost.js-core-0.1.0.tgz --access public
npm publish release-tarballs/router/frost.js-router-0.1.0.tgz --access public
npm publish release-tarballs/data/frost.js-data-0.1.0.tgz --access public
npm publish release-tarballs/react/frost.js-react-0.1.0.tgz --access public
npm publish release-tarballs/server/frost.js-server-0.1.0.tgz --access public
npm publish release-tarballs/adapter-node/frost.js-adapter-node-0.1.0.tgz --access public
npm publish release-tarballs/vite/frost.js-vite-0.1.0.tgz --access public
npm publish release-tarballs/test/frost.js-test-0.1.0.tgz --access public
npm publish release-tarballs/cli/frost.js-cli-0.1.0.tgz --access public
npm publish release-tarballs/create-frost-app/create-frost-app-0.1.0.tgz --access public
```

(Exact tarball filenames may differ if versions change; `ls
release-tarballs/*/` shows them. Publish `create-frost-app` **last**.)

### Dry-run / prerelease testing first

To rehearse without touching `latest`, publish under the `next` tag:

```bash
npm publish <tarball> --access public --tag next
```

`npm create frost-app@next my-app` will then use the prerelease. Delete
the `next` dist-tag later with
`npm dist-tag rm create-frost-app next` if needed.

## 3. Verify the release

```bash
npm view @frost.js/core version
npm view create-frost-app version
```

Then the real-world test in an empty folder:

```bash
mkdir smoke-test && cd smoke-test
npm create frost-app@latest my-app
cd my-app
npm install
npm run dev        # http://localhost:3000 — check / and /playground
npm run build
npm start          # production server
```

## 4. Configure trusted publishing (one time per package)

After the first manual publish, configure OIDC trusted publishing so
`.github/workflows/release.yml` can publish without secrets:

For **each** of the 10 packages, on npmjs.com:

1. Open the package → **Settings** → **Trusted Publisher** (may be under
   "Publishing access" / "Trusted publishing").
2. Choose **GitHub Actions** and fill in:
   - Repository owner: `ben-bader` (or the org owning the repo)
   - Repository name: `Frost`
   - Workflow file name: `release.yml`
   - Environment: leave empty
3. Save.

There is intentionally **no `NPM_TOKEN`** anywhere — the workflow uses
`id-token: write` + `npm publish --provenance`.

## 5. Later releases (the normal flow)

```bash
# on main, after merging work
pnpm changeset            # describe the change (patch/minor/major)
pnpm version-packages     # bumps versions + updates CHANGELOGs
pnpm build && pnpm test   # sanity
git add -A && git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
```

The `release.yml` workflow runs on the `v*` tag: it verifies
`npm >= 11.5.1` (Node 24), runs the full gate, packs, and publishes all
tarballs with `--provenance` via OIDC. All packages are in a changesets
**fixed group**, so they always version together.

Before tagging, you can rehearse everything locally:

```bash
pnpm release:check   # pack dry-run + publint + attw + e2e (no registry writes)
pnpm release:pack    # produces ./release-tarballs for a manual publish
```

## 6. Troubleshooting

- **`npm create frost-app` → E404**: the package isn't published yet, or
  you need `npm create frost-app@latest` explicitly / wait for CDN
  propagation (`npm view create-frost-app` to check).
- **E403 on publish**: your account isn't a member of the `frost.js`
  org/scope, or 2FA OTP was wrong/expired — re-run and enter the current
  code. For scoped packages you also need `--access public` on first
  publish (already in the commands above).
- **Wrong files in tarball**: inspect with
  `tar -tzf release-tarballs/<pkg>/*.tgz`. `src/`, tests, and
  tsbuildinfo must not appear — `files: ["dist"]` plus
  `scripts/strip-dist-tests.mjs` (runs at the end of each package
  build) enforce this. Fix and re-run `pnpm release:pack`.
- **OIDC / provenance failures in CI**: check the workflow prints
  `npm -v` >= 11.5.1 (Node 24 is required — trusted publishing needs a
  recent npm). Confirm the trusted publisher entry on npmjs.com matches
  owner `ben-bader`, repo `Frost`, workflow `release.yml` exactly.
- **Published versions can't be reused**: npm versions are immutable.
  If you published a broken `0.1.0`, bump to `0.1.1` (or `0.2.0`) via
  changesets and publish that instead — never try to overwrite.
- **`pnpm pack` fails with `ERR_PNPM_BIN_CRLF`**: a bin file has CRLF
  line endings. `.gitattributes` forces LF for `bin.js`; renormalize
  with `git add --renormalize .` if needed.
