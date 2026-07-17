import 'server-only';
import { db } from '@/db';
import {
  transactions,
  accounts,
  categories,
  tags,
  transactionTags,
  type Transaction,
  type TransactionType,
  type TransactionStatus,
} from '@/db/schema';
import { and, or, eq, gte, lte, like, desc, inArray, sql, type SQL } from 'drizzle-orm';

export interface TxAccountRef {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
}
export interface TxCategoryRef {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  kind: string;
}
export interface TxTagRef {
  id: string;
  name: string;
  color: string | null;
}

export interface TransactionEnriched extends Transaction {
  account: TxAccountRef | null;
  category: TxCategoryRef | null;
  transferAccountName: string | null;
  tags: TxTagRef[];
}

export interface TransactionFilters {
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  from?: Date;
  to?: Date;
  tagId?: string;
  limit?: number;
  offset?: number;
}

function buildConditions(f: TransactionFilters): SQL[] {
  const conds: SQL[] = [];
  if (f.search) {
    const q = `%${f.search}%`;
    const clause = or(like(transactions.payee, q), like(transactions.notes, q));
    if (clause) conds.push(clause);
  }
  if (f.accountId) conds.push(eq(transactions.accountId, f.accountId));
  if (f.categoryId) conds.push(eq(transactions.categoryId, f.categoryId));
  if (f.type) conds.push(eq(transactions.type, f.type));
  if (f.status) conds.push(eq(transactions.status, f.status));
  if (f.from) conds.push(gte(transactions.date, f.from));
  if (f.to) conds.push(lte(transactions.date, f.to));
  if (f.tagId) {
    conds.push(
      inArray(
        transactions.id,
        db
          .select({ id: transactionTags.transactionId })
          .from(transactionTags)
          .where(eq(transactionTags.tagId, f.tagId)),
      ),
    );
  }
  return conds;
}

async function attachTags(
  rows: Omit<TransactionEnriched, 'tags'>[],
): Promise<TransactionEnriched[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const tagRows = await db
    .select({
      transactionId: transactionTags.transactionId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(inArray(transactionTags.transactionId, ids));
  const byTx = new Map<string, TxTagRef[]>();
  for (const t of tagRows) {
    const arr = byTx.get(t.transactionId) ?? [];
    arr.push({ id: t.id, name: t.name, color: t.color });
    byTx.set(t.transactionId, arr);
  }
  return rows.map((r) => ({ ...r, tags: byTx.get(r.id) ?? [] }));
}

const transferAccounts = () => accounts;

export async function listTransactions(
  f: TransactionFilters = {},
): Promise<{ items: TransactionEnriched[]; total: number }> {
  const conds = buildConditions(f);
  const where = conds.length ? and(...conds) : undefined;

  const ta = transferAccounts();
  const rows = await db
    .select({
      tx: transactions,
      accId: accounts.id,
      accName: accounts.name,
      accType: accounts.type,
      accColor: accounts.color,
      accIcon: accounts.icon,
      catId: categories.id,
      catName: categories.name,
      catColor: categories.color,
      catIcon: categories.icon,
      catKind: categories.kind,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(where)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(f.limit ?? 50)
    .offset(f.offset ?? 0);

  // transfer account names (small set, resolve in one pass)
  const transferIds = rows.map((r) => r.tx.transferAccountId).filter((x): x is string => !!x);
  const transferNameMap = new Map<string, string>();
  if (transferIds.length) {
    const trows = await db
      .select({ id: ta.id, name: ta.name })
      .from(ta)
      .where(inArray(ta.id, transferIds));
    for (const t of trows) transferNameMap.set(t.id, t.name);
  }

  const base: Omit<TransactionEnriched, 'tags'>[] = rows.map((r) => ({
    ...r.tx,
    account: r.accId
      ? {
          id: r.accId,
          name: r.accName!,
          type: r.accType!,
          color: r.accColor,
          icon: r.accIcon,
        }
      : null,
    category: r.catId
      ? {
          id: r.catId,
          name: r.catName!,
          color: r.catColor,
          icon: r.catIcon,
          kind: r.catKind!,
        }
      : null,
    transferAccountName: r.tx.transferAccountId
      ? (transferNameMap.get(r.tx.transferAccountId) ?? null)
      : null,
  }));

  const items = await attachTags(base);

  const totalRow = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(where)
    .get();

  return { items, total: Number(totalRow?.count ?? 0) };
}

export async function getRecentTransactions(limit = 8): Promise<TransactionEnriched[]> {
  const { items } = await listTransactions({ limit });
  return items;
}

export async function getTransaction(id: string): Promise<TransactionEnriched | null> {
  const row = await db
    .select({
      tx: transactions,
      accId: accounts.id,
      accName: accounts.name,
      accType: accounts.type,
      accColor: accounts.color,
      accIcon: accounts.icon,
      catId: categories.id,
      catName: categories.name,
      catColor: categories.color,
      catIcon: categories.icon,
      catKind: categories.kind,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.id, id))
    .get();
  if (!row) return null;
  const base: Omit<TransactionEnriched, 'tags'> = {
    ...row.tx,
    account: row.accId
      ? {
          id: row.accId,
          name: row.accName!,
          type: row.accType!,
          color: row.accColor,
          icon: row.accIcon,
        }
      : null,
    category: row.catId
      ? {
          id: row.catId,
          name: row.catName!,
          color: row.catColor,
          icon: row.catIcon,
          kind: row.catKind!,
        }
      : null,
    transferAccountName: null,
  };
  const [withTags] = await attachTags([base]);
  return withTags;
}
