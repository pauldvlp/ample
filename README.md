# Ample — personal finance

[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/%40pauldvlp%2Fample.svg)](https://www.npmjs.com/package/@pauldvlp/ample)

A complete, single-user personal finance app with the feel of a beautifully printed
wealth statement rather than a SaaS admin panel. Track accounts, transactions,
budgets, goals, recurring bills, debts, net worth and rich reports — all local-first,
with an optional AI assistant (Amp) you bring your own key to.

**Design language:** _"quiet-luxury private banking meets editorial print"_ — warm
bone-paper surfaces, an evergreen + brass duotone, and the **Fraunces** serif carrying
the hero figures. Deliberately not another stock shadcn template.

## Install

The fastest way to run Ample — no clone, no build step:

```bash
npx @pauldvlp/ample
```

Prints the URL once it's up (`http://127.0.0.1:4211` by default) and stores
its SQLite database in a per-OS app-data folder, so running it again later
(from anywhere) picks up right where you left off. Prefer a permanent command?

```bash
npm install -g @pauldvlp/ample
ample
```

Change the port/bind address/data location with `--port`, `--host`, `--data-dir`
(or the `PORT`/`HOSTNAME`/`DB_FILE_NAME` env vars) — `ample --help` for the full
list. Everything else — currency, language, theme, the AI assistant — is
configured **in the app**, under Settings.

For a persistent self-hosted deployment (systemd, a VPS, a home server), Docker
is the better fit — see [DEPLOY.md](./DEPLOY.md).

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme`) · **shadcn/ui** ("base-nova", built on **Base UI**, not Radix)
- **SQLite** via **better-sqlite3** + **Drizzle ORM** (committed migrations)
- **Recharts** for data-viz · **next-themes** · **sonner** · **driver.js** (guided tours) · **Fraunces / Geist / Geist Mono**
- **pnpm** (via corepack) as the package manager

## Requirements

- **Node ≥ 22.13 to develop** — `pnpm@11.12.0` (pinned below) requires it; running
  `pnpm install` on Node 20 fails outright (`ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`).
  CI runs on 22 and 24. The Docker image is `node:22-slim`. This is separate from
  what an *end user* needs: the published npm package (`npx @pauldvlp/ample`) and the
  Docker image only need Node ≥ 20 at runtime — they don't use pnpm at all.
- **pnpm 11.12.0**, pinned by `"packageManager": "pnpm@11.12.0"` in `package.json`.
  Enable it once with corepack — no global install needed:

  ```bash
  corepack enable
  ```

  pnpm 11 config lives in **`pnpm-workspace.yaml`** (not `.npmrc`, not a `pnpm`
  field in `package.json` — both are ignored in v11). That file already carries the
  build-script approvals (`allowBuilds` for `better-sqlite3`, `esbuild`, `sharp`,
  `unrs-resolver`) and `enablePrePostScripts: true`, so a fresh `pnpm install`
  "just works": better-sqlite3 compiles its native binary and the
  `predev` / `prebuild` migrate hooks fire.

## Features

- **Dashboard** — bento overview: net worth hero + trend, cash-flow and
  income-vs-expense stat tiles, spending donut, income-vs-expense chart, upcoming
  bills, recent activity, goals, budget progress and accounts at a glance.
- **Accounts** — checking / savings / cash / investment / credit / loan / other,
  grouped into assets & liabilities with live computed balances, credit limits &
  utilisation, per-account currency, archiving, and an "include in net worth" toggle.
- **Transactions** — income / expense / two-legged transfers, categories, tags,
  reusable payees, notes, cleared/pending/reconciled status, splits, per-line
  foreign-currency capture, filtering & search, grouped ledger, inline edit.
- **Categories** — customisable income / expense / transfer, parent → subcategory
  nesting, colour + icon, seeded defaults, archiving.
- **Budgets** — monthly per-category budgets, actual-vs-budgeted meters, optional
  rollover, copy-from-last-month, unbudgeted spending.
- **Goals** — targets, deadlines, linked accounts, contributions, priority &
  status (active / paused / completed / archived), and projected completion pace.
- **Recurring & subscriptions** — rules with frequency (daily → yearly) + interval,
  optional auto-post, a subscription flag, upcoming-bills view, "post now", and
  total monthly / annual recurring spend.
- **Debts** — person-to-person balances that sit outside your accounts:
  **receivables** (money owed to you, an asset) and **payables** (money you owe, a
  liability), each with a counterparty, principal, payment history, outstanding
  balance and optional due date. They fold into net worth (toggleable per debt).
- **Reports** — net worth trend, income vs expense (monthly), spending by category,
  cash flow, net saved / savings rate, over selectable date ranges.
- **Net worth** — snapshots (manual & scheduled) with per-account balance breakdowns.
- **Multi-currency** — a base currency plus exchange rates you can refresh from the
  internet or edit by hand; transactions keep their original foreign amount for
  reference while all totals/reports run in the base currency.
- **AI assistant, Amp (optional, off by default)** — bring your own key. Pick a provider
  (**Anthropic / OpenAI / Google**), paste an API key that is stored **server-side
  only** (never sent to the browser), and the app can:
  - **quick-add** transactions from natural language ("gasté $50 en el super") —
    with a fully **offline heuristic parser** as the fallback when AI is off;
  - write a **natural-language monthly summary** and **budget/goal advice**;
  - answer a **finance chat** grounded in your data (streamed);
  - **list the models your key can actually use** (queried live from the provider);
  - **translate your category names** into the UI language.
- **Simulation / time-machine** — a sandboxed "what-if" mode: it snapshots your
  data, lets you fast-forward the clock (+1 day / +1 week / +1 month, auto-posting
  recurring bills as they fall due) to watch balances and net worth evolve, then
  restores everything untouched when you exit.
- **Guided tutorials** — an interactive welcome tour on first run, plus a guided
  walkthrough on every page, all replayable from Settings (driver.js).
- **Settings** — display name, base currency, language (Spanish / English), theme,
  number-format locale, first day of week, budget start day, UI font, UI scale and
  icon-stroke weight, exchange rates, a **privacy blur** to hide amounts, AI
  configuration, and **CSV export** under Settings → Data.
- Money is stored as **signed integer cents** throughout; light / dark themes span
  every screen and chart.

## Development setup

Running from source (for contributing — see [CONTRIBUTING.md](./CONTRIBUTING.md)):

```bash
corepack enable        # once, to activate the pinned pnpm
pnpm install           # install deps (better-sqlite3 builds a native binary)
pnpm db:migrate        # apply migrations -> ./data/ample.db
pnpm db:seed           # (optional) rich multi-month demo dataset
pnpm dev               # http://localhost:4211
```

`db:migrate` runs automatically before `dev` and `build` (see the `predev` /
`prebuild` scripts, enabled via `enablePrePostScripts` in `pnpm-workspace.yaml`).
For a production run:

```bash
pnpm build
pnpm start
```

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build & serve |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | Generate a migration from the schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push the schema straight to the db (dev only) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:reset` | Drop the db, migrate, and reseed |
| `pnpm db:studio` | Drizzle Studio |

## Data & persistence

SQLite lives at `./data/ample.db` (WAL mode, foreign keys on). It is gitignored — the
committed source of truth for the schema is `db/schema.ts` + the `drizzle/` migrations.
All reads happen in Server Components / the data layer (`lib/data/*`) and all writes go
through Server Actions (`lib/actions/*`), which revalidate on mutation.

> Note: because it uses a native SQLite driver, deploy Ample anywhere with a persistent
> filesystem (local, a VPS, Railway, Fly). Vercel's serverless filesystem is ephemeral,
> so it is not the target here — the requirement was SQLite + real persistence. See
> [DEPLOY.md](./DEPLOY.md) for the Docker setup.

## Project layout

```
app/(app)/            route group with the sidebar/topbar shell + all pages
app/api/              route handlers (CSV export, AI chat stream)
components/ui/         shadcn (base-nova) primitives
components/shared/     Amount, StatTile, SectionCard, Icon, forms, …
components/charts/     Recharts wrappers (net worth, donut, bars, meter, sparkline)
components/<feature>/  per-feature UI (dashboard, accounts, transactions, ai, onboarding, …)
db/                    Drizzle schema, connection, seed
lib/data/              server-only read queries
lib/actions/           "use server" mutations (zod-validated)
lib/ai/                provider adapters, offline parser, model metadata, context
drizzle/               committed SQL migrations
bin/                   ample.mjs — the npx/npm CLI entry point
scripts/               migration runner + npm-package staging script
```

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for dev
setup, conventions (start with [`AGENTS.md`](./AGENTS.md)), and how commits/
releases work. Please also read the [Code of Conduct](./CODE_OF_CONDUCT.md).
Security issue? See [SECURITY.md](./SECURITY.md) — please don't file it as a
public issue.

## License

[MIT](./LICENSE) © Paul Barahona
