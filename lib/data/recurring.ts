import "server-only";
import { db } from "@/db";
import {
  recurringRules,
  accounts,
  categories,
  transactions,
  type RecurringRule,
} from "@/db/schema";
import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { addDays } from "date-fns";
import { getNow } from "./clock";

export interface RecurringWithRefs extends RecurringRule {
  accountName: string | null;
  accountColor: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  /** normalized monthly cost (positive = outflow) for comparison */
  monthlyEquivalent: number;
  /** how many transactions this rule has generated (posted) so far */
  postedCount: number;
  /** date of the most recent generated transaction, if any */
  lastPostedDate: Date | null;
}

const FREQ_PER_YEAR: Record<string, number> = {
  daily: 365,
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

function monthlyEquivalent(r: RecurringRule): number {
  const perYear = (FREQ_PER_YEAR[r.frequency] ?? 12) / (r.interval || 1);
  return Math.round((Math.abs(r.amount) * perYear) / 12);
}

export async function getRecurringRules(): Promise<RecurringWithRefs[]> {
  const [rows, postings] = await Promise.all([
    db
      .select({
        rule: recurringRules,
        accountName: accounts.name,
        accountColor: accounts.color,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(recurringRules)
      .leftJoin(accounts, eq(recurringRules.accountId, accounts.id))
      .leftJoin(categories, eq(recurringRules.categoryId, categories.id))
      .orderBy(asc(recurringRules.nextDueDate)),
    // one pass over generated transactions → count + latest date per rule
    db
      .select({
        ruleId: transactions.recurringRuleId,
        count: sql<number>`COUNT(*)`,
        last: sql<number>`MAX(${transactions.date})`,
      })
      .from(transactions)
      .where(isNotNull(transactions.recurringRuleId))
      .groupBy(transactions.recurringRuleId),
  ]);

  const stats = new Map(postings.map((p) => [p.ruleId, p]));

  return rows.map((r) => {
    const s = stats.get(r.rule.id);
    return {
      ...r.rule,
      accountName: r.accountName,
      accountColor: r.accountColor,
      categoryName: r.categoryName,
      categoryColor: r.categoryColor,
      categoryIcon: r.categoryIcon,
      monthlyEquivalent: monthlyEquivalent(r.rule),
      postedCount: Number(s?.count ?? 0),
      lastPostedDate: s?.last != null ? new Date(Number(s.last)) : null,
    };
  });
}

export interface UpcomingBill extends RecurringWithRefs {
  daysUntil: number;
}

export async function getUpcomingBills(
  withinDays = 30
): Promise<UpcomingBill[]> {
  const all = await getRecurringRules();
  const now = await getNow();
  const horizon = addDays(now, withinDays);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  return all
    .filter(
      (r) =>
        r.isActive &&
        r.type !== "income" &&
        r.nextDueDate <= horizon
    )
    .map((r) => ({
      ...r,
      daysUntil: Math.round(
        (r.nextDueDate.getTime() - startOfToday.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export interface SubscriptionSummary {
  items: RecurringWithRefs[];
  monthlyTotal: number;
  annualTotal: number;
}

export async function getSubscriptions(): Promise<SubscriptionSummary> {
  const all = await getRecurringRules();
  const items = all.filter((r) => r.isSubscription && r.isActive);
  const monthlyTotal = items.reduce((s, r) => s + r.monthlyEquivalent, 0);
  return { items, monthlyTotal, annualTotal: monthlyTotal * 12 };
}

export async function getRecurringTotals() {
  const all = await getRecurringRules();
  const active = all.filter((r) => r.isActive);
  const monthlyOut = active
    .filter((r) => r.type !== "income")
    .reduce((s, r) => s + r.monthlyEquivalent, 0);
  const monthlyIn = active
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.monthlyEquivalent, 0);
  return { monthlyOut, monthlyIn, count: active.length };
}
