import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { recurringRules, transactions } from '@/db/schema';
import { advanceDue, postDueRulesUpTo } from '@/lib/recurring-engine';
import { resetDb, seedBase, at } from './helpers';

describe('advanceDue (pure date math)', () => {
  it('steps each frequency by its period × interval', () => {
    expect(advanceDue(at(2026, 1, 1), 'daily', 5)).toEqual(at(2026, 1, 6));
    expect(advanceDue(at(2026, 1, 1), 'weekly', 1)).toEqual(at(2026, 1, 8));
    expect(advanceDue(at(2026, 1, 1), 'biweekly', 1)).toEqual(at(2026, 1, 15));
    expect(advanceDue(at(2026, 1, 15), 'monthly', 1)).toEqual(at(2026, 2, 15));
    expect(advanceDue(at(2026, 1, 15), 'quarterly', 1)).toEqual(at(2026, 4, 15));
    expect(advanceDue(at(2026, 1, 15), 'yearly', 1)).toEqual(at(2027, 1, 15));
  });

  it('clamps month-end overflow like date-fns (Jan 31 monthly → Feb 28)', () => {
    expect(advanceDue(at(2026, 1, 31), 'monthly', 1)).toEqual(at(2026, 2, 28));
  });

  it('falls back to monthly for an unknown frequency', () => {
    expect(advanceDue(at(2026, 1, 15), 'fortnightly?', 1)).toEqual(at(2026, 2, 15));
  });
});

describe('postDueRulesUpTo (integration, throwaway DB)', () => {
  beforeEach(async () => {
    await resetDb();
    await seedBase();
  });

  const rule = (over: Partial<typeof recurringRules.$inferInsert> = {}) => ({
    id: 'rule_rent',
    name: 'Rent',
    accountId: 'acc_cash',
    categoryId: 'cat_food',
    type: 'expense' as const,
    amount: -1000,
    frequency: 'monthly' as const,
    interval: 1,
    startDate: at(2026, 1, 1),
    nextDueDate: at(2026, 1, 1),
    isActive: true,
    ...over,
  });

  it('catches up across every missed period and advances the rule', async () => {
    await db.insert(recurringRules).values(rule());

    const posted = await postDueRulesUpTo(at(2026, 3, 15));

    expect(posted).toBe(3); // Jan, Feb, Mar
    const txs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.recurringRuleId, 'rule_rent'));
    expect(txs).toHaveLength(3);
    expect(txs.every((t) => t.amount === -1000)).toBe(true);

    const [r] = await db.select().from(recurringRules).where(eq(recurringRules.id, 'rule_rent'));
    expect(r.nextDueDate).toEqual(at(2026, 4, 1));
    expect(r.lastGeneratedDate).toEqual(at(2026, 3, 1));
  });

  it('stops a rule once its next due passes endDate', async () => {
    await db.insert(recurringRules).values(rule({ endDate: at(2026, 2, 1) }));

    const posted = await postDueRulesUpTo(at(2026, 6, 1));

    expect(posted).toBe(2); // Jan + Feb, then Mar 1 > endDate
  });

  it('ignores inactive rules', async () => {
    await db.insert(recurringRules).values(rule({ isActive: false }));
    expect(await postDueRulesUpTo(at(2026, 6, 1))).toBe(0);
  });
});
