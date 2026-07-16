<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ample — project conventions

**Stack:** Next.js 16 (App Router) · React 19 · TS · Tailwind v4 (CSS-first, config in `app/globals.css`) · shadcn "base-nova" UI on **Base UI** (`@base-ui/react`, NOT Radix) · SQLite via better-sqlite3 + Drizzle.

## Money & dates
- Money is **signed integer cents** everywhere. Render with `<Amount value={cents}/>` / `<AnimatedAmount/>` — never format currency by hand (they read currency/locale from `SettingsProvider` and apply the privacy blur).
- Dates stored as unix-ms (`integer timestamp_ms`). Native `<input type="date">` + `toDateInputValue` / `fromDateInputValue` (`lib/format.ts`). Server actions take epoch-ms.

## Data flow
- Reads: `lib/data/*.ts` (`import "server-only"`), called from Server Components.
- Writes: `lib/actions/*.ts` (`"use server"`, zod-validated), return `{ok:true,data?} | {ok:false,error}`, and call `revalidateFinance()` (revalidatePath layout).
- DB singleton: `db/index.ts` (globalThis-cached, WAL + FKs). Schema: `db/schema.ts`. Migrations committed in `drizzle/`. Run `pnpm db:generate` then `pnpm db:migrate` after schema changes.

## AI assistant
- The in-app AI assistant is named **Amp** — it introduces itself as such in the system prompts (`lib/ai/agent.ts`, `app/api/ai/chat/route.ts`) and in the chat UI (i18n `assistant.title`, tour copy). Keep that name in any new prompt/copy; don't revert to a generic "the assistant" wording.

## UI conventions (Base UI, not Radix)
- Dialog/Sheet/AlertDialog: `open`/`onOpenChange`; trigger via `render={<Button/>}`.
- Select: `onValueChange` gives `string | null` — coalesce `?? ""`. Switch: `onCheckedChange` (boolean).
- Design tokens only: `bg-card`, `text-muted-foreground`, `text-positive`/`negative`/`brass`/`primary`, `shadow-card`, `rounded-2xl`. Headings/figures use `font-display` (Fraunces). Reference: `components/transactions/transaction-form.tsx`, `app/(app)/page.tsx`.

## Tooling
- Package manager is **pnpm 11.12.0** (via corepack, pinned by `packageManager` in `package.json`). Scripts run as `pnpm <script>` (e.g. `pnpm dev`, `pnpm db:migrate`); `next dev` (Turbopack) is still the default dev server.
- pnpm 11 config lives in **`pnpm-workspace.yaml`** — `allowBuilds` (build-script approvals for `better-sqlite3`, `esbuild`, `sharp`, `unrs-resolver`) and `enablePrePostScripts` (so the `predev`/`prebuild` migrate hooks fire). Don't reintroduce `.npmrc` or a `pnpm` field in `package.json` — v11 ignores both.

## Don't
- Don't run the app on port 3000 during dev sessions without checking; `next dev` (Turbopack) is the default. Don't add `serverExternalPackages: ["better-sqlite3"]` (it's built-in; adding it breaks the instrumentation hook under Turbopack).
