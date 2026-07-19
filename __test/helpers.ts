import { db } from '@/db';
import {
  settings,
  accounts,
  categories,
  transactions,
  budgets,
  debts,
  debtPayments,
  debtInstallments,
  recurringRules,
  goals,
} from '@/db/schema';

/** Wipe every table (child → parent, FKs are ON) so each test starts clean. */
export async function resetDb() {
  await db.delete(transactions);
  await db.delete(debtInstallments);
  await db.delete(debtPayments);
  await db.delete(budgets);
  await db.delete(recurringRules);
  await db.delete(goals);
  await db.delete(debts);
  await db.delete(categories);
  await db.delete(accounts);
  await db.delete(settings);
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
