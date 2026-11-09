# Contributing

Thanks for helping build Frost. This file covers the practical setup; [docs/project/contributing-architecture.md](docs/project/contributing-architecture.md) covers repo layout and how to extend the framework.

## Setup

**Prerequisites:** Node.js ≥ 22, pnpm ≥ 9 (`corepack enable` works).

```bash
git clone https://github.com/ben-bader/Frost.git
cd Frost
pnpm install
pnpm typecheck && pnpm test && pnpm build
```

Works on Windows (Git Bash, PowerShell, cmd) and Linux/macOS. Shell scripts in `scripts/` are Node-based and cross-platform — prefer them over ad-hoc shell.

## Workflow

1. Branch from `main` (or the active release branch): `git checkout -b feat/short-name`.
2. Make the change with tests where behavior is involved.
3. Commit with a message that says *why*, not just what. One logical change per commit.
4. Open a PR against `main` using the template.

### Commit conventions

No strict conventional-commits requirement, but prefixing helps: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`. Keep messages under ~72 chars.

## Before submitting

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm release:check   # full gate: pack, publint/attw, template drift, e2e
pnpm docs:check      # if you touched docs
pnpm docs:check-assets  # if you touched docs/assets
```

## Changesets

User-facing changes need a changeset:

```bash
pnpm changeset
```

Framework packages version together in a fixed group; `create-frost-app` versions independently. See [docs/RELEASING.md](docs/RELEASING.md).

## Docs

Docs changes must pass `pnpm docs:check` — links, code snippets, config coverage, and banned-language rules are enforced. Feature claims must be verified against code; planned features go on the [roadmap](docs/project/roadmap.md) only.

## Code of conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).

## Reporting bugs / requesting features

Use the issue templates — include OS, Node version, package manager, and Frost versions.

## Questions

Open a [Discussion](https://github.com/ben-bader/Frost/discussions) or an issue labeled `question`.
