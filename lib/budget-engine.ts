import 'server-only';
import { db } from '@/db';
import { accounts, budgets, transactions } from '@/db/schema';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  getDaysInMonth,
  differenceInCalendarDays,
  min as dfMin,
} from 'date-fns';
import { monthKey } from '@/lib/format';
import { newId } from '@/lib/ids';
import { getSettings } from '@/lib/data/settings';

/** Marks the synthetic expenses this engine posts, so they're easy to spot in a
 *  simulated ledger (and could be reverted selectively later). All of it is
 *  discarded when the user exits simulation, like everything else. */
export const SIM_BUDGET_MARKER = 'sim:budget';

/** Asset-side account types, preferred as the fallback "spending" account. */
const ASSET_TYPES = ['checking', 'cash', 'savings', 'investment'];

/** Fraction (0..1) of the month starting at `monthStart` that has elapsed by
 *  `until`, counted by whole calendar days. A fully-past month is 1; day 1 of a
 *  31-day month is 1/31. Used to prorate a partial month's budget. */
function monthElapsedFraction(monthStart: Date, until: Date): number {
  const end = endOfMonth(monthStart);
  if (until >= end) return 1;
  if (until < monthStart) return 0;
  const days = getDaysInMonth(monthStart);
  const elapsed = Math.min(days, differenceInCalendarDays(until, monthStart) + 1);
  return elapsed / days;
}

/** Most-used account per expense category (by transaction count), so simulated
 *  budget spending lands where that category is normally paid from. */
async function topAccountByCategory(): Promise<Map<string, string>> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      accountId: transactions.accountId,
      n: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(eq(transactions.type, 'expense'))
    .groupBy(transactions.categoryId, transactions.accountId);

  const best = new Map<string, { acct: string; n: number }>();
  for (const r of rows) {
    if (!r.categoryId) continue;
    const n = Number(r.n);
    const cur = best.get(r.categoryId);
    if (!cur || n > cur.n) best.set(r.categoryId, { acct: r.accountId, n });
  }
  const out = new Map<string, string>();
  for (const [cat, v] of best) out.set(cat, v.acct);
  return out;
}

/** Fallback account to debit for a category with no spending history: the first
 *  non-archived asset account, else the first non-archived account. */
async function pickDefaultAccount(): Promise<string | null> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isArchived, false))
    .orderBy(asc(accounts.displayOrder));
  if (rows.length === 0) return null;
  const asset = rows.find((a) => ASSET_TYPES.includes(a.type));
  return (asset ?? rows[0]).id;
}

/**
 * Project the user's budgeted spending forward and post it as simulated expenses
 * so the time-machine gives a REALISTIC picture instead of only fixed bills.
 *
 * The gap it fills is cumulative and double-count-safe: for each budgeted
 * category and each month M in `[from, until]`, it targets
 *   desired = elapsedFraction(M, until) × projectedBudget(M, category)
 * and posts only `max(0, desired − alreadySpentThisMonth)`. "alreadySpent"
 * includes real transactions, recurring rules and debt installments already
 * posted this step, and any budget spend from a previous advance — so:
 *   • recurring/cuota expenses that live in a budgeted category are never
 *     double-charged (they eat into the same target),
 *   • a partial month is prorated by elapsed days,
 *   • repeated advances self-correct (each recomputes against actual spend).
 *
 * Future months usually have no budget row of their own, so the most recent
 * budget period on/before that month is used as the template (else the earliest
 * available). Categories with no budget are intentionally left alone. Amounts are
 * base-currency cents (budgets and transactions share that unit — no conversion).
 * Does NOT revalidate — the caller (advanceSimClock) does. Returns rows posted.
 */
export async function postBudgetSpendUpTo(from: Date, until: Date): Promise<number> {
  if (until <= from) return 0;

  const s = await getSettings();
  const base = s.baseCurrency;
  const label = s.language === 'en' ? 'Budgeted spend (sim.)' : 'Gasto presupuestado (sim.)';

  // 1) each category's budget history, ascending by period ('YYYY-MM' sorts
  //    lexicographically == chronologically). Projected PER CATEGORY so a
  //    category budgeted only in an earlier month still carries forward.
  const budgetRows = await db.select().from(budgets);
  const byCat = new Map<string, { period: string; amount: number }[]>();
  for (const b of budgetRows) {
    if (b.amount <= 0) continue;
    let arr = byCat.get(b.categoryId);
    if (!arr) byCat.set(b.categoryId, (arr = []));
    arr.push({ period: b.period, amount: b.amount });
  }
  if (byCat.size === 0) return 0;
  for (const arr of byCat.values())
    arr.sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));

  /** The category's budget for month `k`: its most recent period on/before `k`,
   *  else its earliest (when `k` precedes any budget the user has set). */
  const budgetForCatMonth = (arr: { period: string; amount: number }[], k: string): number => {
    let chosen = arr[0];
    for (const e of arr) {
      if (e.period <= k) chosen = e;
      else break;
    }
    return chosen.amount;
  };

  // 2) months touched by the window [startOfMonth(from) .. until]
  const months: Date[] = [];
  const GUARD = 600; // ~50 years of monthly steps, a runaway backstop
  let cursor = startOfMonth(from);
  while (cursor <= until && months.length < GUARD) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  if (months.length === 0) return 0;

  // 3) actual expense already booked per (monthKey|categoryId) in the window
  const spentRows = await db
    .select({
      categoryId: transactions.categoryId,
      date: transactions.date,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'expense'),
        gte(transactions.date, months[0]),
        lte(transactions.date, until),
      ),
    );
  const spent = new Map<string, number>(); // key -> positive cents
  for (const r of spentRows) {
    if (!r.categoryId) continue;
    const key = `${monthKey(r.date)}|${r.categoryId}`;
    spent.set(key, (spent.get(key) ?? 0) + -r.amount); // expense amount is negative
  }

  // 4) where to debit
  const acctByCat = await topAccountByCategory();
  const defaultAccountId = await pickDefaultAccount();
  if (!defaultAccountId) return 0; // no account exists to spend from

  // 5) post the remaining gap per category per month
  const rows: (typeof transactions.$inferInsert)[] = [];
  for (const monthStart of months) {
    const frac = monthElapsedFraction(monthStart, until);
    if (frac <= 0) continue;
    const k = monthKey(monthStart);
    const postDate = dfMin([endOfMonth(monthStart), until]);
    for (const [catId, history] of byCat) {
      const amount = budgetForCatMonth(history, k);
      if (amount <= 0) continue;
      const desired = Math.round(frac * amount);
      const already = spent.get(`${k}|${catId}`) ?? 0;
      const gap = desired - already;
      if (gap <= 0) continue;
      rows.push({
        id: newId(),
        accountId: acctByCat.get(catId) ?? defaultAccountId,
        categoryId: catId,
        type: 'expense',
        amount: -gap,
        currency: base,
        date: postDate,
        payee: label,
        notes: label,
        status: 'cleared',
        externalId: SIM_BUDGET_MARKER,
      });
    }
  }

  if (rows.length === 0) return 0;
  await db.insert(transactions).values(rows);
  return rows.length;
}
