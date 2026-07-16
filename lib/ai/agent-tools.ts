import "server-only";

import { z } from "zod";
import { formatMoney } from "@/lib/money";
import { monthKey } from "@/lib/format";
import { ACCOUNT_TYPES, FREQUENCIES } from "@/db/schema";
import { createTransaction } from "@/lib/actions/transactions";
import {
  createRecurring,
  toggleRecurringActive,
  postRecurringNow,
} from "@/lib/actions/recurring";
import { createDebt, addDebtPayment, setDebtStatus } from "@/lib/actions/debts";
import { createGoal, addContribution, setGoalStatus } from "@/lib/actions/goals";
import { createAccount } from "@/lib/actions/accounts";
import { createCategory } from "@/lib/actions/categories";
import { upsertBudget } from "@/lib/actions/budgets";
import { updateSettings } from "@/lib/actions/settings";
import { setManualRate } from "@/lib/actions/rates";

/**
 * The agent's action toolbox. Each tool wraps an existing server action so the
 * conversational assistant can DO things (not just answer): file transactions,
 * set up recurring rules, track debts, fund goals, budget, etc. The LLM emits
 * tool calls by NAME with human-friendly params (names, not ids; positive major
 * units); resolvers here turn those into the ids/cents the actions expect.
 *
 * Tools that create an entity register it back into the (mutable) context so a
 * later tool in the SAME batch can reference it by name — e.g. "create category
 * Mascotas and log 200 spent on Mascotas" works in one message.
 */

/* --------------------------------- context -------------------------------- */

export type AgentLang = "es" | "en";

export interface AgentAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
}
export interface AgentCategory {
  id: string;
  name: string;
  kind: string;
}
export interface AgentDebt {
  id: string;
  counterparty: string;
  name: string | null;
  kind: string;
  outstanding: number;
  status: string;
}
export interface AgentGoal {
  id: string;
  name: string;
}
export interface AgentRecurring {
  id: string;
  name: string;
  isActive: boolean;
}

/** Mutable working context shared across a single batch of tool calls. */
export interface AgentCtx {
  base: string;
  locale: string;
  lang: AgentLang;
  now: Date;
  accounts: AgentAccount[];
  categories: AgentCategory[];
  debts: AgentDebt[];
  goals: AgentGoal[];
  recurring: AgentRecurring[];
}

/* ------------------------------- run result ------------------------------- */

export interface ToolResult {
  ok: boolean;
  /** short, bold chip label (localized) — e.g. "Gasto" / "Expense" */
  label: string;
  /** secondary chip text — e.g. "L 350.00 · Súper" */
  detail?: string;
  /** present when ok === false */
  error?: string;
}

interface ToolDef {
  name: string;
  /** one-line description + params, injected into the system prompt */
  doc: string;
  schema: z.ZodType;
  run: (args: unknown, ctx: AgentCtx) => Promise<ToolResult>;
}

/* -------------------------------- helpers --------------------------------- */

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // fold diacritics: "Súper" ~ "super", "Juán" ~ "juan"
    .trim()
    .toLowerCase();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Does `needle` appear in `hay` as a prefix word or a whole word? Lets
 *  "Banco"/"BAC" resolve "Banco BAC" while refusing "Ana" → "Susana". */
function wordMatch(hay: string, needle: string): boolean {
  if (!hay || !needle) return false;
  if (hay === needle || hay.startsWith(`${needle} `)) return true;
  return new RegExp(`(^|\\s)${escapeRe(needle)}($|\\s)`).test(hay);
}

function money(ctx: AgentCtx, major: number, currency?: string | null): string {
  return formatMoney(Math.round(major * 100), {
    currency: (currency || ctx.base).toUpperCase(),
    locale: ctx.locale,
  });
}

/** Parse a model-supplied date. Accepts "YYYY-MM-DD" (anchored at local noon to
 *  dodge timezone slips) and falls back to the app's "now". */
function toEpoch(ctx: AgentCtx, iso?: string | null): number {
  if (!iso) return ctx.now.getTime();
  const s = String(iso).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? ctx.now.getTime() : d.getTime();
}

/**
 * Resolve a name to an entity: exact (accent-insensitive) first, then an
 * UNAMBIGUOUS word/prefix match. Returns null when nothing matches or when the
 * fuzzy match is ambiguous (>1 candidate) — callers then error or leave the
 * field unset, which is the safe outcome for money-moving tools. Empty candidate
 * keys never match (so a null-named debt can't act as a wildcard).
 */
function match<T>(list: T[], name: string, key: (t: T) => string): T | null {
  const n = norm(name);
  if (!n) return null;
  const exact = list.find((t) => norm(key(t)) === n);
  if (exact) return exact;
  if (n.length < 2) return null; // too short to fuzzy-match safely
  const cands = list.filter((t) => {
    const k = norm(key(t));
    return k.length >= 2 && (wordMatch(k, n) || wordMatch(n, k));
  });
  return cands.length === 1 ? cands[0] : null;
}

/** Resolve the source account. Missing name → first account (a transaction must
 *  have one). Provided-but-unknown name → null WITH missing=true, so the caller
 *  errors instead of silently booking to an arbitrary account. */
function pickAccount(
  ctx: AgentCtx,
  name?: string | null
): { account: AgentAccount | null; missing: boolean } {
  if (!name) return { account: ctx.accounts[0] ?? null, missing: false };
  const found = match(ctx.accounts, name, (a) => a.name);
  return { account: found, missing: !found };
}

/** Strict account lookup (no fallback) — used for a transfer destination. */
function resolveAccountStrict(
  ctx: AgentCtx,
  name?: string | null
): AgentAccount | null {
  if (!name) return null;
  return match(ctx.accounts, name, (a) => a.name);
}

function resolveCategory(
  ctx: AgentCtx,
  name: string | null | undefined,
  kind: "income" | "expense"
): AgentCategory | null {
  if (!name) return null;
  const ofKind = ctx.categories.filter((c) => c.kind === kind);
  return match(ofKind, name, (c) => c.name);
}

function resolveDebt(
  ctx: AgentCtx,
  ref: string,
  debtName?: string | null
): AgentDebt | null {
  const open = ctx.debts.filter((d) => d.status === "open");
  const pool = open.length ? open : ctx.debts;
  if (debtName) {
    const byName = match(
      pool.filter((d) => d.name),
      debtName,
      (d) => d.name as string
    );
    if (byName) return byName;
  }
  return (
    match(pool, ref, (d) => d.counterparty) ??
    match(pool.filter((d) => d.name), ref, (d) => d.name as string) ??
    null
  );
}

const LABELS = {
  es: {
    income: "Ingreso",
    expense: "Gasto",
    transfer: "Transferencia",
    recurring: "Recurrente",
    receivable: "Préstamo (te deben)",
    payable: "Deuda (debes)",
    payment: "Abono a deuda",
    goal: "Meta",
    contribution: "Aporte a meta",
    account: "Cuenta nueva",
    category: "Categoría nueva",
    budget: "Presupuesto",
    setting: "Ajuste",
    rate: "Tipo de cambio",
    settled: "Deuda saldada",
    goalStatus: "Estado de meta",
    recurringOn: "Recurrente activada",
    recurringOff: "Recurrente pausada",
    posted: "Recurrente registrada",
    notFound: "no encontrado",
    noAccount: "no hay cuentas",
    needDest: "falta la cuenta destino",
    action: "Acción",
    invalidData: "datos inválidos",
    unknownTool: "acción no reconocida",
    failed: "falló",
  },
  en: {
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    recurring: "Recurring",
    receivable: "Loan (owed to you)",
    payable: "Debt (you owe)",
    payment: "Debt payment",
    goal: "Goal",
    contribution: "Goal contribution",
    account: "New account",
    category: "New category",
    budget: "Budget",
    setting: "Setting",
    rate: "Exchange rate",
    settled: "Debt settled",
    goalStatus: "Goal status",
    recurringOn: "Recurring resumed",
    recurringOff: "Recurring paused",
    posted: "Recurring posted",
    notFound: "not found",
    noAccount: "no accounts yet",
    needDest: "missing destination account",
    action: "Action",
    invalidData: "invalid data",
    unknownTool: "unrecognized action",
    failed: "failed",
  },
} as const;

function L(ctx: AgentCtx) {
  return LABELS[ctx.lang];
}

/** Compose a chip detail from the first non-empty parts. */
function joinDetail(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => p && p.trim()).join(" · ");
}

/* --------------------------------- schemas -------------------------------- */

const amount = z.coerce.number().positive();
const optStr = z.string().trim().min(1).optional().nullable();
const optDate = z.string().trim().optional().nullable();
// Robust boolean: real JSON booleans pass through, but tolerate the model
// sending "true"/"false" strings or 1/0 (z.coerce.boolean turns "false" → true).
const boolish = z.preprocess((v) => {
  if (typeof v === "string") return /^(true|1|yes|si|sí|on)$/i.test(v.trim());
  if (typeof v === "number") return v !== 0;
  return v;
}, z.boolean());
const optBool = boolish.optional().nullable();

const createTransactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount,
  currency: optStr,
  account: optStr,
  category: optStr,
  toAccount: optStr,
  payee: optStr,
  date: optDate,
  notes: optStr,
});

const createRecurringSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["income", "expense"]),
  amount,
  frequency: z.enum(FREQUENCIES),
  interval: z.coerce.number().int().min(1).optional().nullable(),
  currency: optStr,
  account: optStr,
  category: optStr,
  payee: optStr,
  nextDueDate: optDate,
  endDate: optDate,
  isSubscription: optBool,
  autoPost: optBool,
  notes: optStr,
});

const createDebtSchema = z.object({
  kind: z.enum(["receivable", "payable"]),
  counterparty: z.string().trim().min(1),
  amount,
  name: optStr,
  currency: optStr,
  account: optStr,
  dueDate: optDate,
  notes: optStr,
});

const addDebtPaymentSchema = z.object({
  counterparty: z.string().trim().min(1),
  amount,
  debtName: optStr,
  currency: optStr,
  date: optDate,
  note: optStr,
  recordTransaction: optBool,
});

const createGoalSchema = z.object({
  name: z.string().trim().min(1),
  targetAmount: amount,
  currentAmount: z.coerce.number().min(0).optional().nullable(),
  targetDate: optDate,
  account: optStr,
  notes: optStr,
});

const contributeGoalSchema = z.object({
  goal: z.string().trim().min(1),
  amount,
  note: optStr,
});

const createAccountSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(ACCOUNT_TYPES),
  currency: optStr,
  startingBalance: z.coerce.number().optional().nullable(),
  institution: optStr,
  includeInNetWorth: optBool,
  notes: optStr,
});

const createCategorySchema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(["income", "expense"]),
});

const setBudgetSchema = z.object({
  category: z.string().trim().min(1),
  amount: z.coerce.number().min(0),
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .nullable(),
  rollover: optBool,
});

const setRateSchema = z.object({
  currency: z.string().trim().min(2),
  rate: z.coerce.number().positive(),
});

const updateSettingsSchema = z.object({
  language: z.enum(["es", "en"]).optional().nullable(),
  displayName: optStr,
});

const settleDebtSchema = z.object({
  counterparty: z.string().trim().min(1),
  debtName: optStr,
});

const setGoalStatusSchema = z.object({
  goal: z.string().trim().min(1),
  status: z.enum(["active", "completed", "paused", "archived"]),
});

const toggleRecurringSchema = z.object({
  name: z.string().trim().min(1),
  active: boolish,
});

const postRecurringSchema = z.object({ name: z.string().trim().min(1) });

/* --------------------------------- tools ---------------------------------- */

export const TOOLS: Record<string, ToolDef> = {
  create_transaction: {
    name: "create_transaction",
    doc:
      'Record ONE transaction. Params: type ("income"|"expense"|"transfer"), amount (positive), ' +
      "currency? (ISO, default base), account? (name; default first account), category? (name; ignored for transfer), " +
      "toAccount? (destination account name — REQUIRED for transfer), payee? (merchant/source), date? (YYYY-MM-DD), notes?.",
    schema: createTransactionSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof createTransactionSchema>;
      const label =
        a.type === "income"
          ? L(ctx).income
          : a.type === "transfer"
          ? L(ctx).transfer
          : L(ctx).expense;
      const picked = pickAccount(ctx, a.account);
      if (!picked.account)
        return {
          ok: false,
          label,
          error: picked.missing ? `${a.account}: ${L(ctx).notFound}` : L(ctx).noAccount,
        };
      const from = picked.account;

      let transferAccountId: string | null = null;
      let who: string | null = a.payee ?? null;
      if (a.type === "transfer") {
        const to = resolveAccountStrict(ctx, a.toAccount);
        if (!to || to.id === from.id)
          return { ok: false, label, error: L(ctx).needDest };
        transferAccountId = to.id;
        who = `${from.name} → ${to.name}`;
      }
      const cat =
        a.type === "transfer"
          ? null
          : resolveCategory(ctx, a.category, a.type as "income" | "expense");

      const res = await createTransaction({
        accountId: from.id,
        type: a.type,
        amount: a.amount,
        currency: a.currency ? a.currency.toUpperCase() : null,
        date: toEpoch(ctx, a.date),
        payee: a.payee ?? null,
        categoryId: cat?.id ?? null,
        notes: a.notes ?? null,
        transferAccountId,
      });
      if (!res.ok) return { ok: false, label, error: res.error };
      return {
        ok: true,
        label,
        detail: joinDetail(money(ctx, a.amount, a.currency), who ?? cat?.name),
      };
    },
  },

  create_recurring: {
    name: "create_recurring",
    doc:
      'Create a recurring rule (subscription, bill, salary…). Params: name, type ("income"|"expense"), amount (positive), ' +
      'frequency ("daily"|"weekly"|"biweekly"|"monthly"|"quarterly"|"yearly"), interval? (int, default 1), ' +
      "currency?, account? (name; default first), category? (name), payee?, nextDueDate? (YYYY-MM-DD, default today), " +
      "endDate? (YYYY-MM-DD), isSubscription? (bool), autoPost? (bool — post automatically when due), notes?.",
    schema: createRecurringSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof createRecurringSchema>;
      const label = L(ctx).recurring;
      const picked = pickAccount(ctx, a.account);
      if (!picked.account)
        return {
          ok: false,
          label,
          error: picked.missing ? `${a.account}: ${L(ctx).notFound}` : L(ctx).noAccount,
        };
      const acc = picked.account;
      const cat = resolveCategory(ctx, a.category, a.type);
      const res = await createRecurring({
        name: a.name,
        accountId: acc.id,
        categoryId: cat?.id ?? null,
        type: a.type,
        amount: a.amount,
        currency: a.currency ? a.currency.toUpperCase() : null,
        payee: a.payee ?? null,
        frequency: a.frequency,
        interval: a.interval ?? 1,
        nextDueDate: toEpoch(ctx, a.nextDueDate),
        endDate: a.endDate ? toEpoch(ctx, a.endDate) : null,
        isSubscription: a.isSubscription ?? false,
        autoPost: a.autoPost ?? false,
        notes: a.notes ?? null,
      });
      if (!res.ok) return { ok: false, label, error: res.error };
      if (res.data)
        ctx.recurring.push({ id: res.data.id, name: a.name, isActive: true });
      return {
        ok: true,
        label,
        detail: joinDetail(
          `${money(ctx, a.amount, a.currency)}/${a.frequency}`,
          a.name
        ),
      };
    },
  },

  create_debt: {
    name: "create_debt",
    doc:
      'Track a person-to-person debt. Params: kind ("receivable" = they owe you | "payable" = you owe), ' +
      "counterparty (person/entity name), amount (positive), name? (label/reason), currency?, account? (linked account name), " +
      "dueDate? (YYYY-MM-DD), notes?.",
    schema: createDebtSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof createDebtSchema>;
      const label = a.kind === "receivable" ? L(ctx).receivable : L(ctx).payable;
      const acc = resolveAccountStrict(ctx, a.account);
      const res = await createDebt({
        kind: a.kind,
        counterparty: a.counterparty,
        name: a.name ?? null,
        amount: a.amount,
        currency: a.currency ? a.currency.toUpperCase() : null,
        accountId: acc?.id ?? null,
        dueDate: a.dueDate ? toEpoch(ctx, a.dueDate) : null,
        notes: a.notes ?? null,
      });
      if (!res.ok) return { ok: false, label, error: res.error };
      if (res.data)
        ctx.debts.push({
          id: res.data.id,
          counterparty: a.counterparty,
          name: a.name ?? null,
          kind: a.kind,
          outstanding: Math.round(a.amount * 100),
          status: "open",
        });
      return {
        ok: true,
        label,
        detail: joinDetail(money(ctx, a.amount, a.currency), a.counterparty),
      };
    },
  },

  add_debt_payment: {
    name: "add_debt_payment",
    doc:
      "Record a payment against an existing debt (identify it by counterparty, optionally debtName). " +
      "Params: counterparty, amount (positive), debtName?, currency?, date? (YYYY-MM-DD), note?, " +
      "recordTransaction? (bool — also post the matching cash movement in the linked account).",
    schema: addDebtPaymentSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof addDebtPaymentSchema>;
      const label = L(ctx).payment;
      const debt = resolveDebt(ctx, a.counterparty, a.debtName);
      if (!debt)
        return { ok: false, label, error: `${a.counterparty}: ${L(ctx).notFound}` };
      const res = await addDebtPayment({
        debtId: debt.id,
        amount: a.amount,
        currency: a.currency ? a.currency.toUpperCase() : null,
        date: a.date ? toEpoch(ctx, a.date) : null,
        note: a.note ?? null,
        recordTransaction: a.recordTransaction ?? false,
      });
      if (!res.ok) return { ok: false, label, error: res.error };
      return {
        ok: true,
        label,
        detail: joinDetail(money(ctx, a.amount, a.currency), debt.counterparty),
      };
    },
  },

  create_goal: {
    name: "create_goal",
    doc:
      "Create a savings goal. Params: name, targetAmount (positive), currentAmount? (already saved), " +
      "targetDate? (YYYY-MM-DD), account? (linked account name), notes?.",
    schema: createGoalSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof createGoalSchema>;
      const label = L(ctx).goal;
      const acc = resolveAccountStrict(ctx, a.account);
      const res = await createGoal({
        name: a.name,
        targetAmount: a.targetAmount,
        currentAmount: a.currentAmount ?? 0,
        targetDate: a.targetDate ? toEpoch(ctx, a.targetDate) : null,
        accountId: acc?.id ?? null,
        notes: a.notes ?? null,
      });
      if (!res.ok) return { ok: false, label, error: res.error };
      if (res.data) ctx.goals.push({ id: res.data.id, name: a.name });
      return {
        ok: true,
        label,
        detail: joinDetail(a.name, money(ctx, a.targetAmount)),
      };
    },
  },

  contribute_to_goal: {
    name: "contribute_to_goal",
    doc:
      "Add money toward a goal (identify it by goal name). Params: goal (goal name), amount (positive), note?.",
    schema: contributeGoalSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof contributeGoalSchema>;
      const label = L(ctx).contribution;
      const goal = match(ctx.goals, a.goal, (g) => g.name);
      if (!goal) return { ok: false, label, error: `${a.goal}: ${L(ctx).notFound}` };
      const res = await addContribution(goal.id, a.amount, a.note ?? undefined);
      if (!res.ok) return { ok: false, label, error: res.error };
      return { ok: true, label, detail: joinDetail(money(ctx, a.amount), goal.name) };
    },
  },

  create_account: {
    name: "create_account",
    doc:
      'Create an account/wallet. Params: name, type ("checking"|"savings"|"credit"|"cash"|"investment"|"loan"|"other"), ' +
      "currency? (default base), startingBalance? (major units, may be negative), institution?, includeInNetWorth? (bool), notes?.",
    schema: createAccountSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof createAccountSchema>;
      const label = L(ctx).account;
      const currency = (a.currency || ctx.base).toUpperCase();
      const res = await createAccount({
        name: a.name,
        type: a.type,
        currency,
        startingBalance: a.startingBalance ?? 0,
        institution: a.institution ?? null,
        includeInNetWorth: a.includeInNetWorth ?? true,
        notes: a.notes ?? null,
      });
      if (!res.ok) return { ok: false, label, error: res.error };
      if (res.data)
        ctx.accounts.push({ id: res.data.id, name: a.name, type: a.type, currency });
      return { ok: true, label, detail: joinDetail(a.name, a.type) };
    },
  },

  create_category: {
    name: "create_category",
    doc:
      'Create a category. Params: name, kind ("income"|"expense"). Reference it by name in later actions of the same message.',
    schema: createCategorySchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof createCategorySchema>;
      const label = L(ctx).category;
      const res = await createCategory({ name: a.name, kind: a.kind });
      if (!res.ok) return { ok: false, label, error: res.error };
      if (res.data)
        ctx.categories.push({ id: res.data.id, name: a.name, kind: a.kind });
      return { ok: true, label, detail: joinDetail(a.name, a.kind) };
    },
  },

  set_budget: {
    name: "set_budget",
    doc:
      "Set (or update) a monthly budget for an EXPENSE category. Params: category (name), amount (positive; 0 removes it), " +
      "period? (YYYY-MM, default current month), rollover? (bool).",
    schema: setBudgetSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof setBudgetSchema>;
      const label = L(ctx).budget;
      const cat = resolveCategory(ctx, a.category, "expense");
      if (!cat) return { ok: false, label, error: `${a.category}: ${L(ctx).notFound}` };
      const period = a.period ?? monthKey(ctx.now);
      const res = await upsertBudget({
        categoryId: cat.id,
        period,
        amount: a.amount,
        rolloverEnabled: a.rollover ?? false,
      });
      if (!res.ok) return { ok: false, label, error: res.error };
      return {
        ok: true,
        label,
        detail: joinDetail(cat.name, money(ctx, a.amount), period),
      };
    },
  },

  set_exchange_rate: {
    name: "set_exchange_rate",
    doc:
      "Set the manual exchange rate for a currency, expressed as how many BASE units equal 1 unit of that currency. " +
      "Params: currency (ISO), rate (positive number — base per 1 foreign unit).",
    schema: setRateSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof setRateSchema>;
      const label = L(ctx).rate;
      const quote = a.currency.toUpperCase();
      const res = await setManualRate(quote, a.rate);
      if (!res.ok) return { ok: false, label, error: res.error };
      return { ok: true, label, detail: `1 ${quote} = ${money(ctx, a.rate)}` };
    },
  },

  update_settings: {
    name: "update_settings",
    doc:
      'Change a safe app setting. Params: language? ("es"|"en"), displayName? (your name shown in the app). ' +
      "Do NOT change the base currency here — tell the user to do that in Settings (it does not reconvert stored data).",
    schema: updateSettingsSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof updateSettingsSchema>;
      const label = L(ctx).setting;
      const patch: { language?: "es" | "en"; displayName?: string } = {};
      if (a.language) patch.language = a.language;
      if (a.displayName) patch.displayName = a.displayName;
      if (!Object.keys(patch).length)
        return { ok: false, label, error: "nothing to change" };
      await updateSettings(patch);
      return { ok: true, label, detail: joinDetail(a.displayName, a.language) };
    },
  },

  /* ------------------------ status / lifecycle tools ---------------------- */

  settle_debt: {
    name: "settle_debt",
    doc:
      "Mark a debt as fully settled/closed. Params: counterparty, debtName?. (Reversible — reopen in the UI.)",
    schema: settleDebtSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof settleDebtSchema>;
      const label = L(ctx).settled;
      const debt = resolveDebt(ctx, a.counterparty, a.debtName);
      if (!debt)
        return { ok: false, label, error: `${a.counterparty}: ${L(ctx).notFound}` };
      const res = await setDebtStatus(debt.id, "settled");
      if (!res.ok) return { ok: false, label, error: res.error };
      debt.status = "settled";
      return { ok: true, label, detail: debt.counterparty };
    },
  },

  set_goal_status: {
    name: "set_goal_status",
    doc:
      'Change a goal\'s status. Params: goal (name), status ("active"|"completed"|"paused"|"archived").',
    schema: setGoalStatusSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof setGoalStatusSchema>;
      const label = L(ctx).goalStatus;
      const goal = match(ctx.goals, a.goal, (g) => g.name);
      if (!goal) return { ok: false, label, error: `${a.goal}: ${L(ctx).notFound}` };
      const res = await setGoalStatus(goal.id, a.status);
      if (!res.ok) return { ok: false, label, error: res.error };
      return { ok: true, label, detail: joinDetail(goal.name, a.status) };
    },
  },

  toggle_recurring: {
    name: "toggle_recurring",
    doc:
      "Pause or resume a recurring rule. Params: name (rule name), active (bool — false pauses, true resumes).",
    schema: toggleRecurringSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof toggleRecurringSchema>;
      const rule = match(ctx.recurring, a.name, (r) => r.name);
      const label = a.active ? L(ctx).recurringOn : L(ctx).recurringOff;
      if (!rule) return { ok: false, label, error: `${a.name}: ${L(ctx).notFound}` };
      const res = await toggleRecurringActive(rule.id, a.active);
      if (!res.ok) return { ok: false, label, error: res.error };
      rule.isActive = a.active;
      return { ok: true, label, detail: rule.name };
    },
  },

  post_recurring_now: {
    name: "post_recurring_now",
    doc:
      "Immediately post a recurring rule as a real transaction and advance its next-due date. Params: name (rule name).",
    schema: postRecurringSchema,
    run: async (raw, ctx) => {
      const a = raw as z.infer<typeof postRecurringSchema>;
      const label = L(ctx).posted;
      const rule = match(ctx.recurring, a.name, (r) => r.name);
      if (!rule) return { ok: false, label, error: `${a.name}: ${L(ctx).notFound}` };
      const res = await postRecurringNow(rule.id);
      if (!res.ok) return { ok: false, label, error: res.error };
      return { ok: true, label, detail: rule.name };
    },
  },
};

/** Bullet list of every tool, injected into the system prompt. */
export function toolCatalog(): string {
  return Object.values(TOOLS)
    .map((t) => `- ${t.name}: ${t.doc}`)
    .join("\n");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Normalize a model action object into { tool, args } (robust to shape drift).
 * Careful: many tools use `name` as a real PARAM (create_category, create_goal,
 * create_recurring, create_debt, create_account), so we only strip the key that
 * actually served as the tool identifier — never blanket-delete `name`.
 */
function splitAction(action: Record<string, unknown>): {
  tool: string | null;
  args: Record<string, unknown>;
} {
  // Which key names the tool? Prefer explicit `tool`, then `action`, then `name`.
  let toolKey: "tool" | "action" | "name" | null = null;
  if (typeof action.tool === "string") toolKey = "tool";
  else if (typeof action.action === "string") toolKey = "action";
  else if (typeof action.name === "string") toolKey = "name";
  const tool = toolKey ? (action[toolKey] as string) : null;

  // Params may be nested under a conventional key, or be the action itself.
  const nested =
    (isRecord(action.params) && action.params) ||
    (isRecord(action.arguments) && action.arguments) ||
    (isRecord(action.args) && action.args) ||
    (isRecord(action.input) && action.input) ||
    null;

  if (nested) return { tool, args: { ...nested } };

  const args: Record<string, unknown> = { ...action };
  // strip only the nesting wrappers and the ONE key that named the tool
  for (const k of ["params", "arguments", "args", "input", "tool"]) delete args[k];
  if (toolKey && toolKey !== "tool") delete args[toolKey];
  return { tool, args };
}

export interface ExecutedAction extends ToolResult {
  /** the tool that ran (or the closest guess) — used for UI icon/key */
  tool: string;
}

/** Validate + execute a single model-emitted action against the context. */
export async function executeAction(
  action: unknown,
  ctx: AgentCtx
): Promise<ExecutedAction> {
  const t = L(ctx);
  if (!action || typeof action !== "object")
    return { tool: "?", ok: false, label: t.action, error: t.invalidData };
  const { tool, args } = splitAction(action as Record<string, unknown>);
  if (!tool)
    return { tool: "?", ok: false, label: t.action, error: t.invalidData };
  const def = TOOLS[tool];
  if (!def) return { tool, ok: false, label: t.action, error: t.unknownTool };
  const parsed = def.schema.safeParse(args);
  if (!parsed.success) {
    return { tool, ok: false, label: t.action, error: t.invalidData };
  }
  try {
    return { tool, ...(await def.run(parsed.data, ctx)) };
  } catch (e) {
    return {
      tool,
      ok: false,
      label: t.action,
      error: e instanceof Error ? e.message : t.failed,
    };
  }
}
