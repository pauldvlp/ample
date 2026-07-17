import 'server-only';
import { db } from '@/db';
import { recurringRules, transactions, type RecurringRule } from '@/db/schema';
import { and, asc, eq, lte } from 'drizzle-orm';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { convertToBase } from '@/lib/money';
import { getLiveConversionContext } from '@/lib/data/rates';
import { newId } from '@/lib/ids';

/** Advance a due date by one period of the given frequency/interval. */
export function advanceDue(date: Date, frequency: string, interval: number): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addWeeks(date, interval);
    case 'biweekly':
      return addWeeks(date, 2 * interval);
    case 'monthly':
      return addMonths(date, interval);
    case 'quarterly':
      return addMonths(date, 3 * interval);
    case 'yearly':
      return addYears(date, interval);
    default:
      return addMonths(date, interval);
  }
}

export interface ConversionCtx {
  base: string;
  rates: Record<string, number>;
}

/**
 * Post one occurrence of a rule as a real transaction (dated at the rule's
 * current `nextDueDate`) and advance its `nextDueDate` by one period. Foreign-
 * priced rules re-convert the sticker price at the current rate. Does NOT
 * revalidate — the caller decides when to. Returns the new next-due date.
 */
export async function postRuleOnce(rule: RecurringRule, ctx: ConversionCtx): Promise<Date> {
  let amount = rule.amount;
  if (rule.originalAmount != null && rule.originalCurrency) {
    const magnitude = convertToBase(
      Math.abs(rule.originalAmount),
      rule.originalCurrency,
      ctx.base,
      ctx.rates,
    );
    amount = rule.type === 'income' ? magnitude : -magnitude;
  }

  await db.insert(transactions).values({
    id: newId(),
    accountId: rule.accountId,
    categoryId: rule.categoryId,
    type: rule.type,
    amount,
    originalAmount: rule.originalAmount,
    originalCurrency: rule.originalCurrency,
    date: rule.nextDueDate,
    payee: rule.payee ?? rule.name,
    notes: rule.notes,
    status: 'cleared',
    recurringRuleId: rule.id,
  });

  const next = advanceDue(rule.nextDueDate, rule.frequency, rule.interval);
  await db
    .update(recurringRules)
    .set({
      lastGeneratedDate: rule.nextDueDate,
      nextDueDate: next,
      updatedAt: new Date(),
    })
    .where(eq(recurringRules.id, rule.id));
  return next;
}

/**
 * Post every active rule whose `nextDueDate` falls on/before `until`, catching
 * up across multiple missed periods. Stops a rule once its next due passes its
 * `endDate`. Returns the number of transactions posted. Used by the simulation
 * time-machine to fast-forward the ledger. Does NOT revalidate.
 */
export async function postDueRulesUpTo(until: Date): Promise<number> {
  const ctx = await getLiveConversionContext();
  const rules = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.isActive, true), lte(recurringRules.nextDueDate, until)))
    .orderBy(asc(recurringRules.nextDueDate));

  const MAX = 2000; // runaway guard across all rules
  let posted = 0;
  for (const rule of rules) {
    let current: RecurringRule = rule;
    while (current.nextDueDate <= until && posted < MAX) {
      if (current.endDate && current.nextDueDate > current.endDate) break;
      const next = await postRuleOnce(current, ctx);
      current = {
        ...current,
        lastGeneratedDate: current.nextDueDate,
        nextDueDate: next,
      };
      posted++;
    }
    if (posted >= MAX) break;
  }
  return posted;
}
