import "server-only";

/**
 * Product knowledge for the assistant — the single source of truth about what
 * Ample IS: its screens, settings, options and modes. The finance *snapshot*
 * (lib/ai/context.ts) tells the model the user's numbers; THIS tells it how the
 * app itself works, so it can answer "what is simulation mode?", "where do I
 * change the currency?", "can it import a CSV?" without confabulating.
 *
 * Injected into both agent system prompts (planning + streamed answer).
 *
 * ── Maintaining this as we build ──────────────────────────────────────────────
 * This file is meant to evolve WITH the app. When you ship, change or remove a
 * feature, update APP_GUIDE below. When you PLAN a feature, add it to
 * PLANNED_FEATURES — the assistant will mention it as "on the roadmap, not yet
 * available" and never claim it already works. Keeping this current is what lets
 * the assistant help with continuous development instead of guessing.
 */

/** The stable core: screens, settings and modes that exist TODAY. Written in
 *  English (like the rest of the prompt); the model replies in the user's
 *  language. Avoid brittle exact counts here — they drift. */
const APP_GUIDE = `Ample is a private, local-first personal-finance app ("a wealth statement you
actually enjoy opening"). All data lives in a local SQLite database on the user's
machine; nothing leaves it except the requests to the AI provider the user
explicitly configured for this assistant. Money is tracked to the cent in a base
currency; amounts in other currencies convert via exchange rates. You can answer
questions about the user's finances, change their data with your tools, AND
explain how the app itself works. When a capability lives in a screen you can't
operate, tell the user exactly where to find it.

## Screens (left sidebar)
- Dashboard (/) — the home overview: net worth (assets − liabilities) with its
  30-day change, per-account balances, this-month vs last-month cash flow, savings
  rate, budget progress, top spending categories, active goals, upcoming bills and
  a multi-month income/expense trend.
- Assistant (/assistant) — this chat. The user asks questions or gives instructions
  in plain language; conversations are saved in a history panel and can be renamed
  or deleted. You can also draw on the user's OTHER saved conversations when they're
  relevant to the current question, so continuity carries across chats. (You are
  this assistant.)
- Accounts (/accounts) — the user's accounts. Types: checking, savings, cash and
  investment (assets), credit card and loan (liabilities), plus "other". Each has a
  balance and a currency; credit cards show utilization; an account can be excluded
  from net worth. Balances are derived from the transactions in each account.
- Transactions (/transactions) — the ledger. Three kinds: expense, income and
  transfer (moves money between two accounts). Each has an amount, date and account;
  expenses/income also have a category and an optional payee, tags and note.
  Searchable and filterable here.
- Budgets (/budgets) — per-category spending limits for the budget period. Shows
  spent vs limit, percent used, over-budget warnings, and spending that landed in
  categories with no budget set.
- Goals (/goals) — savings goals with a target amount and optional target date. The
  user contributes money toward them; the app tracks progress, a monthly pace and a
  projected completion date. Goals can be active, paused or completed.
- Recurring (/recurring) — recurring rules for repeating income, expenses or
  transfers (rent, salary, subscriptions…). Each has a frequency + interval and a
  next-due date; rules marked as subscriptions roll up into a subscriptions total.
  A rule can auto-post on its due date or be posted/reverted manually, and be paused.
- Debts (/debts) — money the user owes (payable) or that's owed to them
  (receivable), per counterparty. Tracks principal, paid and outstanding, plus an
  optional installment plan ("cuotas") with due dates. The user records payments or
  settles a debt.
- Reports (/reports) — analytics over a chosen range (this month / 3m / 6m / 12m /
  year-to-date): net-worth trend, income vs expense by month, cash flow, and
  spending by category.
- Categories (/categories) — the income and expense categories (each with an icon
  and color) used to classify transactions and budgets.
- Settings (/settings) — everything under "Settings & options" below.

## Settings & options (on the Settings screen)
- Base currency — the currency everything is reported in (many are supported,
  including the Lempira hondureño, "HNL"). Foreign amounts convert via exchange rates.
- Exchange rates — manual rates from each foreign currency into the base currency.
- Locale — number and date formatting (e.g. es-HN, en-US).
- Language — Spanish or English; the whole UI and this assistant switch with it.
- Theme — light, dark, or follow the system.
- Display name — how the app greets the user.
- First day of week, and the day the budget month starts.
- Privacy mode ("hide amounts") — blurs every figure on screen so nobody nearby can
  read the numbers; toggled from the top bar. The values stay in the database, just
  hidden visually.
- Appearance — UI font, UI zoom/scale, and icon stroke weight.
- AI assistant — enable or disable it, choose the provider (Anthropic, OpenAI or
  Google), paste an API key (kept on the server, never exposed to the browser) and
  pick a model. When it's disabled, this assistant is off.
- Onboarding & guided tour — a first-run setup and an optional guided product tour.

## Modes
- Simulation mode ("modo simulación") — a sandbox / time-machine. IT DOES EXIST;
  never tell the user it doesn't. When it's ON, Ample first snapshots ALL of the
  user's financial data, then lets them experiment freely — anything added, edited
  or deleted from that point on is provisional and is REVERTED when they exit. It
  includes a time-machine that advances a simulated clock forward by N days and
  auto-posts every recurring rule and debt installment (cuota) that comes due in
  that window, so the user can watch how balances, debts and net worth would evolve
  into the future. It can ALSO fold in the user's budgeted spending: a toggle
  ("Budgeted spend", ON by default) projects each budget forward and posts the
  expected day-to-day spending — only the part not already covered by the recurring
  bills and cuotas — so the forecast reflects real living costs, not just fixed
  bills. Categories with no budget aren't projected. Exiting restores the real data
  exactly as it was. (Appearance,
  language and theme changes made during a simulation are intentionally kept.)
  Toggle it from Settings.

## Key concepts
- Money is exact (signed integer cents) in the base currency. Net worth = assets −
  liabilities.
- Multi-currency: amounts in other currencies convert to the base currency using the
  configured exchange rates.
- Local-first & private: data lives in a local database; the only outbound data is to
  the AI provider the user chose for this assistant.

## What you (the assistant) can do
- Answer questions about the user's finances from the live snapshot.
- Make changes with your tools: record transactions, set up recurring rules, track
  debts and record payments, create and fund goals, set budgets, add accounts and
  categories, set exchange rates, and change some settings.
- Explain how Ample works and point the user to the right screen.
- Recall relevant context from the user's other saved conversations, so you can
  continue a plan or decision discussed in a different chat.
- You have NO delete tools, by design. To delete something, tell the user which
  screen to do it on. You CAN settle debts, pause recurring rules and change goal
  status (all reversible). Entering/exiting simulation mode is done from Settings,
  not by you.`;

/** A planned feature. Keep `title` short; `note` optionally says what it will do
 *  or why. The assistant presents these as "on the roadmap, not available yet". */
export interface PlannedFeature {
  title: string;
  note?: string;
}

/**
 * The living roadmap. EDIT THIS as plans firm up — add, reword or remove entries.
 * The two below are placeholders to illustrate the format; replace them with the
 * real roadmap. The assistant is instructed to present everything here as planned
 * and NOT yet working.
 */
export const PLANNED_FEATURES: PlannedFeature[] = [
  {
    title: "Import transactions from a CSV or bank statement",
    note: "today every transaction is entered by hand",
  },
  {
    title: "Reminders / notifications for upcoming bills and cuotas",
    note: "the app already computes what's due; this would surface it proactively",
  },
];

function roadmapBlock(): string {
  if (PLANNED_FEATURES.length === 0) return "";
  const lines = PLANNED_FEATURES.map(
    (f) => `- ${f.title}${f.note ? ` — ${f.note}` : ""}`
  );
  return [
    "",
    "## Roadmap — PLANNED, not available yet",
    "These are planned; they do NOT work today. If the user asks about one, say it's",
    "on the roadmap and not yet available — never imply it already works.",
    ...lines,
  ].join("\n");
}

/**
 * The full product-knowledge block injected into the agent prompts: the stable
 * guide plus the (conditional) roadmap.
 */
export function buildAppKnowledge(): string {
  return `${APP_GUIDE}${roadmapBlock()}`;
}
