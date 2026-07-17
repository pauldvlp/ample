# Contributing to Ample

Thanks for considering a contribution. Ample is a small, opinionated
self-hosted personal finance app — this doc covers how to get set up, the
conventions the codebase follows, and how changes actually ship.

By participating, you're expected to follow the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting set up

```bash
corepack enable        # once, to activate the pinned pnpm (pnpm@11.12.0)
pnpm install            # installs deps; better-sqlite3 builds a native binary
pnpm db:migrate         # applies migrations -> ./data/ample.db
pnpm db:seed             # optional: a rich multi-month demo dataset
pnpm dev                 # http://localhost:4211
```

See [README.md](./README.md) for the full stack rundown and
[DEPLOY.md](./DEPLOY.md) for Docker.

## Before you touch code: read AGENTS.md

[`AGENTS.md`](./AGENTS.md) is the source of truth for project conventions —
money-as-cents, the `lib/data`/`lib/actions` split, Base UI (not Radix)
patterns, design tokens, and things this project deliberately does _not_ do.
PRs that don't follow it will get bounced back, so it's worth the five-minute
read first. If you're using an AI coding assistant, point it at that file too.

## Checks before opening a PR

```bash
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm build         # next build (also validates the standalone output)
pnpm test:agent    # AI agent tool-layer smoke test (no API key needed)
```

All four run in CI on every PR and must pass before merge.

## Commit messages: Conventional Commits

This repo uses [Conventional Commits](https://www.conventionalcommits.org/),
enforced by commitlint (locally via a git hook, and again in CI — so it's
checked either way). Releases and `CHANGELOG.md` are generated automatically
from these messages by [release-please](https://github.com/googleapis/release-please),
so the prefix you pick actually matters:

| Prefix                                                            | Use for           | Version bump    |
| ----------------------------------------------------------------- | ----------------- | --------------- |
| `fix:`                                                            | Bug fixes         | patch           |
| `feat:`                                                           | New functionality | minor           |
| `feat!:` / `fix!:` (or a `BREAKING CHANGE:` footer)               | Breaking changes  | minor (pre-1.0) |
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `style:`, `perf:` | Everything else   | none            |

Examples:

```
feat: add CSV import for transactions
fix: correct rollover math on monthly budgets
docs: clarify Docker volume backup steps
```

A short, imperative subject line is enough — you don't need a body for most
changes. Keep each commit focused; it's fine for a PR to carry several commits.

## How releases work

You don't need to bump versions or tag anything by hand. Once your PR merges to
`main`, release-please's bot keeps a standing "release PR" up to date with the
next version number and changelog entries computed from merged Conventional
Commits. A maintainer merges that PR whenever it's time to cut a release, which
tags it and publishes `@pauldvlp/ample` to npm automatically (see
[PUBLISHING.md](./PUBLISHING.md) if you're a maintainer setting this up for the
first time).

## Pull requests

- Keep PRs scoped to one change — easier to review, easier for release-please
  to summarize.
- Update or add tests under `__test/` when you touch `lib/ai/*` or the
  budget/recurring/debt engines.
- If your change is user-visible, a screenshot or short clip in the PR
  description goes a long way (this is a design-forward app — regressions in
  spacing/typography/dark-mode are real regressions).
- Not sure if an idea fits before writing code? Open an issue first — happy to
  talk through approach.

## Project layout

See the "Project layout" section in [README.md](./README.md) — it's kept
current there rather than duplicated here.
