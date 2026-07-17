'use server';

import { z } from 'zod';
import { db } from '@/db';
import { accounts, ACCOUNT_TYPES } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { toCents } from '@/lib/money';
import { revalidateFinance, type ActionResult } from './shared';

const accountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  type: z.enum(ACCOUNT_TYPES),
  institution: z.string().trim().max(80).optional().nullable(),
  currency: z.string().trim().length(3).default('USD'),
  startingBalance: z.number().default(0),
  creditLimit: z.number().nullable().optional(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  includeInNetWorth: z.boolean().default(true),
});

export type AccountInput = z.input<typeof accountSchema>;

export async function createAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' };
  }
  const v = parsed.data;
  const row = await db
    .insert(accounts)
    .values({
      name: v.name,
      type: v.type,
      institution: v.institution ?? null,
      currency: v.currency,
      startingBalance: toCents(v.startingBalance),
      creditLimit: v.creditLimit != null ? toCents(v.creditLimit) : null,
      icon: v.icon ?? null,
      color: v.color ?? null,
      notes: v.notes ?? null,
      includeInNetWorth: v.includeInNetWorth,
    })
    .returning({ id: accounts.id })
    .get();
  revalidateFinance();
  return { ok: true, data: { id: row.id } };
}

export async function updateAccount(id: string, input: AccountInput): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' };
  }
  const v = parsed.data;
  await db
    .update(accounts)
    .set({
      name: v.name,
      type: v.type,
      institution: v.institution ?? null,
      currency: v.currency,
      startingBalance: toCents(v.startingBalance),
      creditLimit: v.creditLimit != null ? toCents(v.creditLimit) : null,
      icon: v.icon ?? null,
      color: v.color ?? null,
      notes: v.notes ?? null,
      includeInNetWorth: v.includeInNetWorth,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function setAccountArchived(id: string, isArchived: boolean): Promise<ActionResult> {
  await db.update(accounts).set({ isArchived, updatedAt: new Date() }).where(eq(accounts.id, id));
  revalidateFinance();
  return { ok: true };
}
