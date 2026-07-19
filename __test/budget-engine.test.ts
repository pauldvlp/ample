import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { budgets, transactions } from '@/db/schema';
import { postBudgetSpendUpTo, SIM_BUDGET_MARKER } from '@/lib/budget-engine';
import { resetDb, seedBase, at } from './helpers';

describe('postBudgetSpendUpTo (integration)', () => {
  beforeEach(async () => {
    await resetDb();
    await seedBase();
    // A 2000-cent food budget for January 2026.
    await db.insert(budgets).values({ categoryId: 'cat_food', period: '2026-01', amount: 2000 });
  });

  it('projects a full budgeted month as one synthetic expense', async () => {
    // Window covers exactly January (Feb 1 has 0 elapsed → not posted).
    const posted = await postBudgetSpendUpTo(at(2026, 1, 1), at(2026, 1, 31));

    expect(posted).toBe(1);
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.externalId, SIM_BUDGET_MARKER));
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(-2000);
    expect(rows[0].categoryId).toBe('cat_food');
    expect(rows[0].type).toBe('expense');
  });

  it('subtracts spend already booked, projecting only the gap', async () => {
    await db.insert(transactions).values({
      id: 'tx_actual',
      accountId: 'acc_cash',
      categoryId: 'cat_food',
      type: 'expense',
      amount: -500, // already spent 500 of the 2000 budget
      date: at(2026, 1, 10),
      status: 'cleared',
    });

    await postBudgetSpendUpTo(at(2026, 1, 1), at(2026, 1, 31));

    const [gap] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.externalId, SIM_BUDGET_MARKER));
    expect(gap.amount).toBe(-1500); // 2000 budgeted − 500 spent
  });

  it('posts nothing when there are no budgets', async () => {
    await db.delete(budgets);
    expect(await postBudgetSpendUpTo(at(2026, 1, 1), at(2026, 1, 31))).toBe(0);
  });
});
