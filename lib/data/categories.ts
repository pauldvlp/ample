import 'server-only';
import { db } from '@/db';
import { categories, transactions, type Category, type CategoryKind } from '@/db/schema';
import { asc, sql, eq } from 'drizzle-orm';

export interface CategoryWithUsage extends Category {
  txCount: number;
}

export async function getCategories(includeArchived = false): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));
  return includeArchived ? rows : rows.filter((c) => !c.isArchived);
}

export async function getCategoriesByKind(kind: CategoryKind): Promise<Category[]> {
  return (await getCategories()).filter((c) => c.kind === kind);
}

export async function getCategoriesWithUsage(): Promise<CategoryWithUsage[]> {
  const rows = await getCategories(true);
  const counts = await db
    .select({
      categoryId: transactions.categoryId,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .groupBy(transactions.categoryId);
  const map = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));
  return rows.map((c) => ({ ...c, txCount: map.get(c.id) ?? 0 }));
}

export async function getCategory(id: string): Promise<Category | null> {
  return (await db.select().from(categories).where(eq(categories.id, id)).get()) ?? null;
}
