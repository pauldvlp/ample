'use server';

import { z } from 'zod';
import { db } from '@/db';
import { tags } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidateFinance, type ActionResult } from './shared';

export async function getOrCreateTag(
  name: string,
  color?: string,
): Promise<{ id: string; name: string; color: string | null }> {
  const clean = name.trim().toLowerCase();
  const existing = await db.select().from(tags).where(eq(tags.name, clean)).get();
  if (existing) return existing;
  const row = await db
    .insert(tags)
    .values({ name: clean, color: color ?? null })
    .returning()
    .get();
  return row;
}

export async function createTag(
  name: string,
  color?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = z.string().trim().min(1).max(40).safeParse(name);
  if (!parsed.success) return { ok: false, error: 'Invalid tag name' };
  const tag = await getOrCreateTag(parsed.data, color);
  revalidateFinance();
  return { ok: true, data: { id: tag.id } };
}

export async function deleteTag(id: string): Promise<ActionResult> {
  await db.delete(tags).where(eq(tags.id, id));
  revalidateFinance();
  return { ok: true };
}
