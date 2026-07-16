"use server";

import { z } from "zod";
import { db } from "@/db";
import { payees } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateFinance, type ActionResult } from "./shared";

const payeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  kind: z.enum(["income", "expense"]).nullable().optional(),
});

export type PayeeInput = z.input<typeof payeeSchema>;

/** Create a payee unless one with the same name (case-insensitive) exists.
 *  Idempotent — returns the existing/new row so the combobox can select it. */
export async function createPayee(
  input: PayeeInput
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = payeeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  const { name, kind } = parsed.data;

  const existing = await db
    .select()
    .from(payees)
    .where(sql`lower(${payees.name}) = lower(${name})`)
    .get();
  if (existing) return { ok: true, data: { id: existing.id, name: existing.name } };

  const row = await db
    .insert(payees)
    .values({ name, kind: kind ?? null })
    .onConflictDoNothing()
    .returning({ id: payees.id, name: payees.name })
    .get();
  revalidateFinance();
  return { ok: true, data: row ?? { id: "", name } };
}

export async function deletePayee(id: string): Promise<ActionResult> {
  await db.delete(payees).where(eq(payees.id, id));
  revalidateFinance();
  return { ok: true };
}
