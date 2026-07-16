"use server";

import { z } from "zod";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { toCents } from "@/lib/money";
import { format, subMonths, parse } from "date-fns";
import { revalidateFinance, type ActionResult } from "./shared";

const budgetSchema = z.object({
  categoryId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Invalid period"),
  amount: z.number().min(0),
  rolloverEnabled: z.boolean().default(false),
});

export type BudgetInput = z.input<typeof budgetSchema>;

export async function upsertBudget(input: BudgetInput): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  const v = parsed.data;
  const amountCents = toCents(v.amount);

  if (amountCents <= 0) {
    // treat zero as "remove budget"
    await db
      .delete(budgets)
      .where(and(eq(budgets.categoryId, v.categoryId), eq(budgets.period, v.period)));
    revalidateFinance();
    return { ok: true };
  }

  await db
    .insert(budgets)
    .values({
      categoryId: v.categoryId,
      period: v.period,
      amount: amountCents,
      rolloverEnabled: v.rolloverEnabled,
    })
    .onConflictDoUpdate({
      target: [budgets.categoryId, budgets.period],
      set: {
        amount: amountCents,
        rolloverEnabled: v.rolloverEnabled,
        updatedAt: new Date(),
      },
    });
  revalidateFinance();
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  await db.delete(budgets).where(eq(budgets.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function copyBudgetsFromPreviousMonth(
  period: string
): Promise<ActionResult<{ copied: number }>> {
  const prev = format(subMonths(parse(period, "yyyy-MM", new Date()), 1), "yyyy-MM");
  const prevRows = await db.select().from(budgets).where(eq(budgets.period, prev));
  if (!prevRows.length) return { ok: true, data: { copied: 0 } };
  for (const b of prevRows) {
    await db
      .insert(budgets)
      .values({
        categoryId: b.categoryId,
        period,
        amount: b.amount,
        rolloverEnabled: b.rolloverEnabled,
      })
      .onConflictDoUpdate({
        target: [budgets.categoryId, budgets.period],
        set: { amount: b.amount },
      });
  }
  revalidateFinance();
  return { ok: true, data: { copied: prevRows.length } };
}
