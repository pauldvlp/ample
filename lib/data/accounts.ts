import 'server-only';
import { db } from '@/db';
import { accounts, transactions, type Account } from '@/db/schema';
import { sql, eq, asc } from 'drizzle-orm';
import { ACCOUNT_TYPE_META, type AccountGroup } from '@/lib/constants';
import { getDebtsSummary } from './debts';

export interface AccountWithBalance extends Account {
  balance: number;
  group: AccountGroup;
}

/** Map of accountId -> sum(transaction amounts). */
export async function balanceDeltas(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      accountId: transactions.accountId,
      delta: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .groupBy(transactions.accountId);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.accountId, Number(r.delta));
  return map;
}

export async function getAccountsWithBalances(
  includeArchived = false,
): Promise<AccountWithBalance[]> {
  const rows = await db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.displayOrder), asc(accounts.createdAt));
  const deltas = await balanceDeltas();
  return rows
    .filter((a) => includeArchived || !a.isArchived)
    .map((a) => ({
      ...a,
      balance: a.startingBalance + (deltas.get(a.id) ?? 0),
      group: ACCOUNT_TYPE_META[a.type].group,
    }));
}

export async function getAccountWithBalance(id: string): Promise<AccountWithBalance | null> {
  const a = await db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!a) return null;
  const delta = await db
    .select({
      delta: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.accountId, id))
    .get();
  return {
    ...a,
    balance: a.startingBalance + Number(delta?.delta ?? 0),
    group: ACCOUNT_TYPE_META[a.type].group,
  };
}

export interface NetWorthSummary {
  assets: number;
  liabilities: number;
  netWorth: number;
  /** portion of `assets` that comes from money owed to you (receivables) */
  receivables: number;
  /** portion of `liabilities` that comes from money you owe (payables) */
  payables: number;
  accounts: AccountWithBalance[];
}

export async function getNetWorthSummary(): Promise<NetWorthSummary> {
  const list = await getAccountsWithBalances();
  let assets = 0;
  let liabilities = 0;
  for (const a of list) {
    if (!a.includeInNetWorth) continue;
    if (a.balance >= 0) assets += a.balance;
    else liabilities += -a.balance;
  }
  // Debts fold into net worth: receivables are assets, payables are liabilities.
  const debts = await getDebtsSummary();
  assets += debts.receivable;
  liabilities += debts.payable;
  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
    receivables: debts.receivable,
    payables: debts.payable,
    accounts: list,
  };
}
