import { expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  settings,
  accounts,
  categories,
  transactions,
  tags,
  transactionTags,
  payees,
  budgets,
  goals,
  goalContributions,
  recurringRules,
  debts,
  debtPayments,
  debtInstallments,
  netWorthSnapshots,
  netWorthSnapshotBalances,
  exchangeRates,
  chatThreads,
  chatMessages,
} from '@/db/schema';

// Every table, so a reset is complete regardless of what a test touched. Order is
// irrelevant with FKs off — cheaper than hand-maintaining a child→parent sequence.
const ALL_TABLES = [
  transactionTags,
  transactions,
  tags,
  payees,
  budgets,
  goalContributions,
  goals,
  recurringRules,
  debtInstallments,
  debtPayments,
  debts,
  netWorthSnapshotBalances,
  netWorthSnapshots,
  exchangeRates,
  chatMessages,
  chatThreads,
  categories,
  accounts,
  settings,
];

/** Wipe every table so each test (and each ported .mts, sharing one DB) starts clean. */
export async function resetDb() {
  db.run(sql`PRAGMA foreign_keys = OFF`);
  for (const t of ALL_TABLES) await db.delete(t);
  db.run(sql`PRAGMA foreign_keys = ON`);
}

/** Base fixtures shared by the engine tests: HNL settings, one cash account, two categories. */
export async function seedBase() {
  await db.insert(settings).values({ id: 1, baseCurrency: 'HNL', locale: 'es-HN', language: 'es' });
  await db
    .insert(accounts)
    .values({ id: 'acc_cash', name: 'Cash', type: 'cash', currency: 'HNL', displayOrder: 0 });
  await db.insert(categories).values([
    { id: 'cat_food', name: 'Food', kind: 'expense', displayOrder: 0 },
    { id: 'cat_salary', name: 'Salary', kind: 'income', displayOrder: 1 },
  ]);
}

/** Local-midnight date — engines use date-fns (local time), so build fixtures the same way. */
export const at = (year: number, month1: number, day: number) => new Date(year, month1 - 1, day);

/** Bridges the legacy `assert(name, cond, extra?)` checks (from the ported .mts
 *  scripts) to Vitest's expect — throws on the first failure with the check's name. */
export function assert(name: string, cond: boolean, extra?: unknown) {
  expect(cond, extra === undefined ? name : `${name} — ${String(extra)}`).toBe(true);
}
