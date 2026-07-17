import 'server-only';
import { db } from '@/db';
import { transactions, categories, netWorthSnapshots } from '@/db/schema';
import { and, eq, gte, lte, sql, asc, isNull } from 'drizzle-orm';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { getNow } from './clock';

const monthExpr = sql<string>`strftime('%Y-%m', ${transactions.date} / 1000, 'unixepoch')`;

export interface MonthlyFlow {
  month: string; // YYYY-MM
  label: string; // Jan
  income: number;
  expense: number;
  net: number;
}

export async function incomeVsExpenseMonthly(monthsBack = 6): Promise<MonthlyFlow[]> {
  const now = await getNow();
  const from = startOfMonth(addMonths(now, -(monthsBack - 1)));
  const rows = await db
    .select({
      month: monthExpr,
      type: transactions.type,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    // exclude debt principal movements — a loan isn't income/expense
    .where(and(gte(transactions.date, from), isNull(transactions.debtId)))
    .groupBy(monthExpr, transactions.type);

  const buckets = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < monthsBack; i++) {
    const key = format(addMonths(now, -(monthsBack - 1) + i), 'yyyy-MM');
    buckets.set(key, { income: 0, expense: 0 });
  }
  for (const r of rows) {
    const b = buckets.get(r.month);
    if (!b) continue;
    if (r.type === 'income') b.income += Number(r.total);
    else if (r.type === 'expense') b.expense += -Number(r.total);
  }
  return [...buckets.entries()].map(([month, b]) => ({
    month,
    label: format(new Date(`${month}-01T00:00:00`), 'MMM'),
    income: b.income,
    expense: b.expense,
    net: b.income - b.expense,
  }));
}

export interface CategorySpend {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  amount: number;
  pct: number;
}

export async function spendingByCategory(
  from: Date,
  to: Date,
  limit?: number,
): Promise<CategorySpend[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      color: categories.color,
      icon: categories.icon,
      amount: sql<number>`SUM(-${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.type, 'expense'),
        isNull(transactions.debtId),
        gte(transactions.date, from),
        lte(transactions.date, to),
      ),
    )
    .groupBy(transactions.categoryId)
    .orderBy(sql`SUM(-${transactions.amount}) DESC`);

  const clean = rows
    .map((r) => ({
      categoryId: r.categoryId ?? 'uncategorized',
      name: r.name ?? 'Uncategorized',
      color: r.color,
      icon: r.icon,
      amount: Number(r.amount),
    }))
    .filter((r) => r.amount > 0);
  const total = clean.reduce((s, r) => s + r.amount, 0);
  const withPct = clean.map((r) => ({
    ...r,
    pct: total > 0 ? r.amount / total : 0,
  }));
  return limit ? withPct.slice(0, limit) : withPct;
}

export interface CashFlow {
  income: number;
  expense: number;
  net: number;
}

export async function cashFlow(from: Date, to: Date): Promise<CashFlow> {
  const rows = await db
    .select({
      type: transactions.type,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(gte(transactions.date, from), lte(transactions.date, to), isNull(transactions.debtId)),
    )
    .groupBy(transactions.type);
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income += Number(r.total);
    else if (r.type === 'expense') expense += -Number(r.total);
  }
  return { income, expense, net: income - expense };
}

export function monthRange(period: Date = new Date()) {
  return { from: startOfMonth(period), to: endOfMonth(period) };
}

export interface NetWorthPoint {
  date: number;
  label: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

export async function netWorthSeries(): Promise<NetWorthPoint[]> {
  const rows = await db.select().from(netWorthSnapshots).orderBy(asc(netWorthSnapshots.date));
  return rows.map((r) => ({
    date: r.date.getTime(),
    label: format(r.date, 'MMM'),
    netWorth: r.netWorth,
    assets: r.totalAssets,
    liabilities: r.totalLiabilities,
  }));
}

/** Daily spending for a calendar heatmap over a month. */
export async function dailySpending(from: Date, to: Date): Promise<Record<string, number>> {
  const dayExpr = sql<string>`strftime('%Y-%m-%d', ${transactions.date} / 1000, 'unixepoch')`;
  const rows = await db
    .select({
      day: dayExpr,
      amount: sql<number>`SUM(-${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'expense'),
        isNull(transactions.debtId),
        gte(transactions.date, from),
        lte(transactions.date, to),
      ),
    )
    .groupBy(dayExpr);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.day] = Math.max(0, Number(r.amount));
  return map;
}
