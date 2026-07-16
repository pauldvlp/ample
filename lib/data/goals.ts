import "server-only";
import { db } from "@/db";
import {
  goals,
  goalContributions,
  accounts,
  type Goal,
  type GoalContribution,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { getNow } from "./clock";

export interface GoalWithProgress extends Goal {
  pct: number;
  remaining: number;
  accountName: string | null;
  monthlyPace: number | null;
  projectedDate: Date | null;
}

function projectCompletion(
  remaining: number,
  monthlyPace: number | null,
  from: Date
): Date | null {
  if (!monthlyPace || monthlyPace <= 0 || remaining <= 0) return null;
  const months = Math.ceil(remaining / monthlyPace);
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function getGoalsWithProgress(): Promise<GoalWithProgress[]> {
  const rows = await db
    .select({
      goal: goals,
      accountName: accounts.name,
    })
    .from(goals)
    .leftJoin(accounts, eq(goals.accountId, accounts.id))
    .orderBy(asc(goals.priority), asc(goals.createdAt));

  // rough monthly pace from last 3 months of contributions
  const contribs = await db.select().from(goalContributions);
  const paceByGoal = new Map<string, number>();
  const nowDate = await getNow();
  const now = nowDate.getTime();
  const threeMonthsAgo = now - 1000 * 60 * 60 * 24 * 92;
  const totals = new Map<string, number>();
  for (const c of contribs) {
    if (c.date.getTime() >= threeMonthsAgo && c.amount > 0) {
      totals.set(c.goalId, (totals.get(c.goalId) ?? 0) + c.amount);
    }
  }
  for (const [id, total] of totals) paceByGoal.set(id, Math.round(total / 3));

  return rows.map(({ goal, accountName }) => {
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const pace = paceByGoal.get(goal.id) ?? null;
    return {
      ...goal,
      pct: goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0,
      remaining,
      accountName,
      monthlyPace: pace,
      projectedDate: projectCompletion(remaining, pace, nowDate),
    };
  });
}

export async function getGoal(id: string): Promise<Goal | null> {
  return (await db.select().from(goals).where(eq(goals.id, id)).get()) ?? null;
}

export async function getGoalContributions(
  goalId: string
): Promise<GoalContribution[]> {
  return db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId))
    .orderBy(desc(goalContributions.date));
}
