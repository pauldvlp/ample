'use server';

import { z } from 'zod';
import { db } from '@/db';
import { categories, CATEGORY_KINDS } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidateFinance, type ActionResult } from './shared';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  kind: z.enum(CATEGORY_KINDS),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type CategoryInput = z.input<typeof categorySchema>;

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' };
  const v = parsed.data;
  const row = await db
    .insert(categories)
    .values({
      name: v.name,
      kind: v.kind,
      icon: v.icon ?? null,
      color: v.color ?? null,
      parentId: v.parentId ?? null,
    })
    .returning({ id: categories.id })
    .get();
  revalidateFinance();
  return { ok: true, data: { id: row.id } };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' };
  const v = parsed.data;
  await db
    .update(categories)
    .set({
      name: v.name,
      kind: v.kind,
      icon: v.icon ?? null,
      color: v.color ?? null,
      parentId: v.parentId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  // transactions.category_id is ON DELETE SET NULL, so history is preserved.
  await db.delete(categories).where(eq(categories.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function setCategoryArchived(id: string, isArchived: boolean): Promise<ActionResult> {
  await db
    .update(categories)
    .set({ isArchived, updatedAt: new Date() })
    .where(eq(categories.id, id));
  revalidateFinance();
  return { ok: true };
}
