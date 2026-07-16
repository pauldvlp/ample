import "server-only";
import { db } from "@/db";
import {
  debts,
  debtPayments,
  debtInstallments,
  type Debt,
  type DebtPayment,
  type DebtInstallment,
} from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";

export interface DebtWithOutstanding extends Debt {
  /** total paid so far (base cents) */
  paid: number;
  /** principal − paid, clamped at 0 (base cents) */
  outstanding: number;
  /** planned payment schedule (cuotas), ordered by dueDate. Empty = no plan. */
  installments: DebtInstallment[];
}

export interface DebtDetail extends DebtWithOutstanding {
  payments: DebtPayment[];
}

export interface DebtsSummary {
  /** open outstanding owed TO you (asset) */
  receivable: number;
  /** open outstanding YOU owe (liability) */
  payable: number;
  counts: { receivable: number; payable: number };
}

/** Map of debtId -> sum(payment amounts). */
async function paymentTotals(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      debtId: debtPayments.debtId,
      paid: sql<number>`COALESCE(SUM(${debtPayments.amount}), 0)`,
    })
    .from(debtPayments)
    .groupBy(debtPayments.debtId);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.debtId, Number(r.paid));
  return map;
}

/** Map of debtId -> its installments, ordered by dueDate. */
async function installmentsByDebt(): Promise<Map<string, DebtInstallment[]>> {
  const rows = await db
    .select()
    .from(debtInstallments)
    .orderBy(asc(debtInstallments.dueDate), asc(debtInstallments.createdAt));
  const map = new Map<string, DebtInstallment[]>();
  for (const r of rows) {
    const list = map.get(r.debtId);
    if (list) list.push(r);
    else map.set(r.debtId, [r]);
  }
  return map;
}

function withOutstanding(
  d: Debt,
  paid: number,
  installments: DebtInstallment[]
): DebtWithOutstanding {
  return { ...d, paid, outstanding: Math.max(0, d.principal - paid), installments };
}

export async function getDebts(): Promise<DebtWithOutstanding[]> {
  const rows = await db
    .select()
    .from(debts)
    .orderBy(asc(debts.status), asc(debts.dueDate), desc(debts.createdAt));
  const [totals, insts] = await Promise.all([
    paymentTotals(),
    installmentsByDebt(),
  ]);
  return rows.map((d) =>
    withOutstanding(d, totals.get(d.id) ?? 0, insts.get(d.id) ?? [])
  );
}

export async function getDebt(id: string): Promise<DebtDetail | null> {
  const d = await db.select().from(debts).where(eq(debts.id, id)).get();
  if (!d) return null;
  const [payments, installments] = await Promise.all([
    db
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.debtId, id))
      .orderBy(desc(debtPayments.date)),
    db
      .select()
      .from(debtInstallments)
      .where(eq(debtInstallments.debtId, id))
      .orderBy(asc(debtInstallments.dueDate), asc(debtInstallments.createdAt)),
  ]);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return { ...withOutstanding(d, paid, installments), payments };
}

/** Open, net-worth-included outstanding balances by direction. */
export async function getDebtsSummary(): Promise<DebtsSummary> {
  const list = await getDebts();
  const summary: DebtsSummary = {
    receivable: 0,
    payable: 0,
    counts: { receivable: 0, payable: 0 },
  };
  for (const d of list) {
    if (d.status !== "open" || !d.includeInNetWorth || d.outstanding <= 0)
      continue;
    if (d.kind === "receivable") {
      summary.receivable += d.outstanding;
      summary.counts.receivable += 1;
    } else {
      summary.payable += d.outstanding;
      summary.counts.payable += 1;
    }
  }
  return summary;
}
