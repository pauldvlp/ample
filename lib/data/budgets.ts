import "server-only";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { startOfMonth, endOfMonth } from "date-fns";
import { monthKey, monthKeyToDate } from "@/lib/format";
import { getNow } from "./clock";

export interface BudgetLine {
  budgetId: string | null;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  amount: number;
  spent: number;
  remaining: number;
  pct: number;
  rolloverEnabled: boolean;
}

export interface BudgetSummary {
  period: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  pct: number;
  lines: BudgetLine[];
  unbudgeted: {
    categoryId: string;
    name: string;
    color: string | null;
    icon: string | null;
    spent: number;
  }[];
}

async function spentByCategory(from: Date, to: Date): Promise<Map<string, number>> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      spent: sql<number>`COALESCE(SUM(-${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "expense"),
        gte(transactions.date, from),
        lte(transactions.date, to)
      )
    )
    .groupBy(transactions.categoryId);
  const map = new Map<string, number>();
  for (const r of rows) if (r.categoryId) map.set(r.categoryId, Number(r.spent));
  return map;
}

export async function getBudgetSummary(
  period?: string
): Promise<BudgetSummary> {
  period = period ?? monthKey(await getNow());
  const monthDate = monthKeyToDate(period);
  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);

  const [budgetRows, spent, expenseCats] = await Promise.all([
    db.select().from(budgets).where(eq(budgets.period, period)),
    spentByCategory(from, to),
    db.select().from(categories).where(eq(categories.kind, "expense")),
  ]);

  const catMap = new Map(expenseCats.map((c) => [c.id, c]));
  const budgetedCatIds = new Set(budgetRows.map((b) => b.categoryId));

  const lines: BudgetLine[] = budgetRows
    .map((b) => {
      const c = catMap.get(b.categoryId);
      const s = spent.get(b.categoryId) ?? 0;
      return {
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: c?.name ?? "Unknown",
        categoryColor: c?.color ?? null,
        categoryIcon: c?.icon ?? null,
        amount: b.amount,
        spent: s,
        remaining: b.amount - s,
        pct: b.amount > 0 ? s / b.amount : s > 0 ? 1 : 0,
        rolloverEnabled: b.rolloverEnabled,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const unbudgeted = [...spent.entries()]
    .filter(([id]) => !budgetedCatIds.has(id))
    .map(([id, s]) => {
      const c = catMap.get(id);
      return {
        categoryId: id,
        name: c?.name ?? "Uncategorized",
        color: c?.color ?? null,
        icon: c?.icon ?? null,
        spent: s,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const totalBudget = lines.reduce((s, l) => s + l.amount, 0);
  const totalSpent = lines.reduce((s, l) => s + l.spent, 0);

  return {
    period,
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    pct: totalBudget > 0 ? totalSpent / totalBudget : 0,
    lines,
    unbudgeted,
  };
}

export async function getAvailableBudgetPeriods(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ period: budgets.period })
    .from(budgets);
  const set = new Set(rows.map((r) => r.period));
  set.add(monthKey(await getNow()));
  return [...set].sort().reverse();
}
