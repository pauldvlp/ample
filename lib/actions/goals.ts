"use server";

import { z } from "zod";
import { db } from "@/db";
import { goals, goalContributions, GOAL_STATUS } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { toCents } from "@/lib/money";
import { newId } from "@/lib/ids";
import { revalidateFinance, type ActionResult } from "./shared";

const goalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  targetAmount: z.number().positive("Target must be greater than zero"),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.number().nullable().optional(), // epoch ms
  accountId: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  notes: z.string().trim().max(400).nullable().optional(),
});

export type GoalInput = z.input<typeof goalSchema>;

export async function createGoal(
  input: GoalInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  const v = parsed.data;
  const row = await db
    .insert(goals)
    .values({
      name: v.name,
      targetAmount: toCents(v.targetAmount),
      currentAmount: toCents(v.currentAmount),
      targetDate: v.targetDate ? new Date(v.targetDate) : null,
      accountId: v.accountId || null,
      icon: v.icon ?? null,
      color: v.color ?? null,
      notes: v.notes ?? null,
    })
    .returning({ id: goals.id })
    .get();
  revalidateFinance();
  return { ok: true, data: { id: row.id } };
}

export async function updateGoal(
  id: string,
  input: GoalInput
): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  const v = parsed.data;
  await db
    .update(goals)
    .set({
      name: v.name,
      targetAmount: toCents(v.targetAmount),
      currentAmount: toCents(v.currentAmount),
      targetDate: v.targetDate ? new Date(v.targetDate) : null,
      accountId: v.accountId || null,
      icon: v.icon ?? null,
      color: v.color ?? null,
      notes: v.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  await db.delete(goals).where(eq(goals.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function setGoalStatus(
  id: string,
  status: (typeof GOAL_STATUS)[number]
): Promise<ActionResult> {
  await db
    .update(goals)
    .set({ status, updatedAt: new Date() })
    .where(eq(goals.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function addContribution(
  goalId: string,
  amount: number,
  note?: string
): Promise<ActionResult> {
  if (!Number.isFinite(amount) || amount === 0)
    return { ok: false, error: "Enter an amount" };
  const cents = toCents(amount);
  await db.insert(goalContributions).values({
    id: newId(),
    goalId,
    amount: cents,
    date: new Date(),
    note: note?.trim() || null,
  });
  await db
    .update(goals)
    .set({
      currentAmount: sql`MAX(0, ${goals.currentAmount} + ${cents})`,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId));
  // auto-complete
  const g = await db.select().from(goals).where(eq(goals.id, goalId)).get();
  if (g && g.currentAmount >= g.targetAmount && g.status === "active") {
    await db.update(goals).set({ status: "completed" }).where(eq(goals.id, goalId));
  }
  revalidateFinance();
  return { ok: true };
}

export async function deleteContribution(
  contributionId: string,
  goalId: string,
  amount: number
): Promise<ActionResult> {
  await db
    .delete(goalContributions)
    .where(eq(goalContributions.id, contributionId));
  await db
    .update(goals)
    .set({
      currentAmount: sql`MAX(0, ${goals.currentAmount} - ${amount})`,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId));
  revalidateFinance();
  return { ok: true };
}
