import "server-only";
import { db } from "@/db";
import {
  debts,
  debtPayments,
  debtInstallments,
  transactions,
  type Debt,
} from "@/db/schema";
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { getConversionContext } from "@/lib/data/rates";
import { newId } from "@/lib/ids";

export interface PostDebtPaymentArgs {
  debt: Debt;
  /** positive magnitude, base-currency cents */
  amount: number;
  date: Date;
  note?: string | null;
  /** also post the matching cash movement to the debt's linked account */
  recordTransaction: boolean;
  /** base currency code, for the cash transaction's `currency` field */
  base: string;
  /** foreign sticker magnitude kept for reference on the cash movement */
  originalAmount?: number | null;
  originalCurrency?: string | null;
}

/**
 * Post one payment against a debt: insert the `debt_payments` row, optionally the
 * matching cash `transactions` row (signed by the debt's direction and tagged
 * with both `debtId` and `debtPaymentId` so it can be reclaimed precisely), then
 * auto-settle the debt once fully paid. Returns the new payment id. Does NOT
 * revalidate — the caller decides. Shared by the manual payment action, the
 * "mark installment paid" action, and the simulation installment poster.
 */
export async function postDebtPaymentCore(
  args: PostDebtPaymentArgs
): Promise<{ paymentId: string }> {
  const { debt, amount, date, note, recordTransaction, base } = args;
  const paymentId = newId();

  await db.insert(debtPayments).values({
    id: paymentId,
    debtId: debt.id,
    amount,
    date,
    note: note ?? null,
  });

  if (recordTransaction && debt.accountId) {
    // receivable → they repay you → cash IN (income); payable → you repay → OUT.
    const signed = debt.kind === "receivable" ? amount : -amount;
    const isForeign =
      args.originalAmount != null && !!args.originalCurrency;
    await db.insert(transactions).values({
      id: newId(),
      accountId: debt.accountId,
      categoryId: null,
      type: debt.kind === "receivable" ? "income" : "expense",
      amount: signed,
      currency: base,
      originalAmount: isForeign
        ? debt.kind === "receivable"
          ? args.originalAmount!
          : -args.originalAmount!
        : null,
      originalCurrency: isForeign ? args.originalCurrency! : null,
      date,
      payee: debt.counterparty,
      notes: debt.name,
      status: "cleared",
      debtId: debt.id,
      debtPaymentId: paymentId,
    });
  }

  // auto-settle once fully paid
  const paidRow = await db
    .select({ paid: sql<number>`COALESCE(SUM(${debtPayments.amount}), 0)` })
    .from(debtPayments)
    .where(eq(debtPayments.debtId, debt.id))
    .get();
  const paid = Number(paidRow?.paid ?? 0);
  if (paid >= debt.principal && debt.status !== "settled") {
    await db
      .update(debts)
      .set({ status: "settled", updatedAt: new Date() })
      .where(eq(debts.id, debt.id));
  }

  return { paymentId };
}

/**
 * Post every pending debt installment whose `dueDate` falls on/before `until`,
 * in date order. Each posts a real payment (reducing the debt's outstanding and
 * moving cash in the linked account) and links back via `paidPaymentId`. The
 * amount is clamped to the debt's remaining outstanding so an over-scheduled plan
 * never overpays; already-settled/deleted debts are skipped. Returns the number
 * posted. Used by the simulation time-machine alongside `postDueRulesUpTo`. Does
 * NOT revalidate.
 */
export async function postDueDebtInstallmentsUpTo(until: Date): Promise<number> {
  const { base } = await getConversionContext();
  const due = await db
    .select()
    .from(debtInstallments)
    .where(
      and(
        isNull(debtInstallments.paidPaymentId),
        lte(debtInstallments.dueDate, until)
      )
    )
    .orderBy(asc(debtInstallments.dueDate), asc(debtInstallments.createdAt));

  const MAX = 2000; // runaway guard
  let posted = 0;
  for (const inst of due) {
    if (posted >= MAX) break;
    const debt = await db
      .select()
      .from(debts)
      .where(eq(debts.id, inst.debtId))
      .get();
    if (!debt || debt.status !== "open") continue;

    const paidRow = await db
      .select({ paid: sql<number>`COALESCE(SUM(${debtPayments.amount}), 0)` })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debt.id))
      .get();
    const outstanding = Math.max(0, debt.principal - Number(paidRow?.paid ?? 0));
    if (outstanding <= 0) continue;

    const amount = Math.min(inst.amount, outstanding);
    const { paymentId } = await postDebtPaymentCore({
      debt,
      amount,
      date: inst.dueDate,
      note: inst.note,
      recordTransaction: !!debt.accountId,
      base,
    });
    await db
      .update(debtInstallments)
      .set({ paidPaymentId: paymentId, updatedAt: new Date() })
      .where(eq(debtInstallments.id, inst.id));
    posted++;
  }
  return posted;
}
