"use server";

import { z } from "zod";
import { db } from "@/db";
import {
  debts,
  debtPayments,
  debtInstallments,
  transactions,
} from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { toCents, convertToBase } from "@/lib/money";
import { getConversionContext } from "@/lib/data/rates";
import { newId } from "@/lib/ids";
import { postDebtPaymentCore } from "@/lib/debt-engine";
import { revalidateFinance, type ActionResult } from "./shared";

/** One planned installment ("cuota"). Amount is in BASE-currency major units. */
const installmentInputSchema = z.object({
  amount: z.number().positive(),
  /** epoch ms */
  dueDate: z.number(),
  note: z.string().trim().max(200).nullable().optional(),
});

const debtSchema = z.object({
  kind: z.enum(["receivable", "payable"]),
  counterparty: z.string().trim().min(1, "Counterparty is required").max(120),
  name: z.string().trim().max(120).nullable().optional(),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  openedDate: z.number().nullable().optional(),
  dueDate: z.number().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  notes: z.string().trim().max(400).nullable().optional(),
  /** planned payment schedule; when present it drives the debt's due date and
   *  the simulation. Amounts are base-currency major units. */
  installments: z.array(installmentInputSchema).optional(),
  /** also post the opening cash movement to the linked account */
  recordTransaction: z.boolean().optional(),
});

export type DebtInput = z.input<typeof debtSchema>;

/** The debt's headline due date = last scheduled installment, else the plain
 *  `dueDate` field (informal debts with no plan). */
function scheduleDueDate(
  installments: { dueDate: number }[] | undefined,
  fallback: number | null | undefined
): Date | null {
  if (installments && installments.length > 0) {
    return new Date(Math.max(...installments.map((i) => i.dueDate)));
  }
  return fallback ? new Date(fallback) : null;
}

export async function createDebt(
  input: DebtInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = debtSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  const v = parsed.data;
  const { base, rates } = await getConversionContext();
  const isForeign = !!v.currency && v.currency !== base;
  const enteredCents = toCents(v.amount);
  const principal = isForeign
    ? convertToBase(enteredCents, v.currency!, base, rates)
    : enteredCents;
  const when = v.openedDate ? new Date(v.openedDate) : new Date();

  const row = await db
    .insert(debts)
    .values({
      kind: v.kind,
      counterparty: v.counterparty,
      name: v.name || null,
      principal,
      currency: base,
      originalAmount: isForeign ? enteredCents : null,
      originalCurrency: isForeign ? v.currency! : null,
      accountId: v.accountId || null,
      openedDate: when,
      dueDate: scheduleDueDate(v.installments, v.dueDate),
      icon: v.icon || null,
      color: v.color || null,
      notes: v.notes || null,
    })
    .returning({ id: debts.id })
    .get();

  // planned installments (cuotas), stored as positive base cents
  if (v.installments && v.installments.length > 0) {
    await db.insert(debtInstallments).values(
      v.installments.map((i) => ({
        id: newId(),
        debtId: row.id,
        amount: toCents(i.amount),
        dueDate: new Date(i.dueDate),
        note: i.note || null,
      }))
    );
  }

  // Opening cash movement (the origin of the debt), symmetric to a repayment:
  //  - payable (you BORROWED): cash comes IN now → income; you'll repay later.
  //  - receivable (you LENT): cash goes OUT now → expense; they'll repay later.
  // The debt itself carries the offsetting liability/asset, so net worth is flat
  // at creation and the account balance reflects the real cash you got/gave.
  if (v.recordTransaction && v.accountId) {
    const signed = v.kind === "payable" ? principal : -principal;
    await db.insert(transactions).values({
      id: newId(),
      accountId: v.accountId,
      categoryId: null,
      type: v.kind === "payable" ? "income" : "expense",
      amount: signed,
      currency: base,
      originalAmount: isForeign
        ? v.kind === "payable"
          ? enteredCents
          : -enteredCents
        : null,
      originalCurrency: isForeign ? v.currency! : null,
      date: when,
      payee: v.counterparty,
      notes: v.name || null,
      status: "cleared",
      debtId: row.id,
    });
  }

  revalidateFinance();
  return { ok: true, data: { id: row.id } };
}

export async function updateDebt(
  id: string,
  input: DebtInput
): Promise<ActionResult> {
  const parsed = debtSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  const v = parsed.data;
  const { base, rates } = await getConversionContext();
  const isForeign = !!v.currency && v.currency !== base;
  const enteredCents = toCents(v.amount);
  const principal = isForeign
    ? convertToBase(enteredCents, v.currency!, base, rates)
    : enteredCents;

  // Reconcile the schedule: posted installments (paidPaymentId set) are real
  // history and stay untouched; the incoming list replaces the PENDING ones.
  await db
    .delete(debtInstallments)
    .where(
      and(
        eq(debtInstallments.debtId, id),
        isNull(debtInstallments.paidPaymentId)
      )
    );
  if (v.installments && v.installments.length > 0) {
    await db.insert(debtInstallments).values(
      v.installments.map((i) => ({
        id: newId(),
        debtId: id,
        amount: toCents(i.amount),
        dueDate: new Date(i.dueDate),
        note: i.note || null,
      }))
    );
  }

  // headline due date derived from all installments (posted + pending), else the
  // plain dueDate field.
  const remaining = await db
    .select({ dueDate: debtInstallments.dueDate })
    .from(debtInstallments)
    .where(eq(debtInstallments.debtId, id));
  const dueDate =
    remaining.length > 0
      ? new Date(Math.max(...remaining.map((r) => r.dueDate.getTime())))
      : v.dueDate
        ? new Date(v.dueDate)
        : null;

  await db
    .update(debts)
    .set({
      kind: v.kind,
      counterparty: v.counterparty,
      name: v.name || null,
      principal,
      currency: base,
      originalAmount: isForeign ? enteredCents : null,
      originalCurrency: isForeign ? v.currency! : null,
      accountId: v.accountId || null,
      openedDate: v.openedDate ? new Date(v.openedDate) : undefined,
      dueDate,
      icon: v.icon || null,
      color: v.color || null,
      notes: v.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(debts.id, id));
  revalidateFinance();
  return { ok: true };
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  // Reclaim any cash movements this debt posted (opening draw + repayments), so
  // deleting the debt also removes the offsetting cash and net worth stays
  // consistent instead of jumping by the outstanding principal. Installments
  // cascade-delete via their FK.
  await db.delete(transactions).where(eq(transactions.debtId, id));
  await db.delete(debts).where(eq(debts.id, id));
  revalidateFinance();
  return { ok: true };
}

const paymentSchema = z.object({
  debtId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().nullable().optional(),
  date: z.number().nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
  /** also post a matching cash transaction to the linked account */
  recordTransaction: z.boolean().optional(),
});

export type DebtPaymentInput = z.input<typeof paymentSchema>;

/** Record a payment against a debt, reducing its outstanding balance. When
 *  `recordTransaction` is set (and the debt has a linked account) it also posts
 *  the matching cash movement so net worth stays consistent. Auto-settles when
 *  fully paid. */
export async function addDebtPayment(
  input: DebtPaymentInput
): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  const v = parsed.data;

  const debt = await db.select().from(debts).where(eq(debts.id, v.debtId)).get();
  if (!debt) return { ok: false, error: "Debt not found" };

  const { base, rates } = await getConversionContext();
  const isForeign = !!v.currency && v.currency !== base;
  const enteredCents = toCents(v.amount);
  const amount = isForeign
    ? convertToBase(enteredCents, v.currency!, base, rates)
    : enteredCents;
  const when = v.date ? new Date(v.date) : new Date();

  await postDebtPaymentCore({
    debt,
    amount,
    date: when,
    note: v.note || null,
    recordTransaction: !!v.recordTransaction,
    base,
    originalAmount: isForeign ? enteredCents : null,
    originalCurrency: isForeign ? v.currency! : null,
  });

  revalidateFinance();
  return { ok: true };
}

export async function setDebtStatus(
  id: string,
  status: "open" | "settled"
): Promise<ActionResult> {
  await db
    .update(debts)
    .set({ status, updatedAt: new Date() })
    .where(eq(debts.id, id));
  revalidateFinance();
  return { ok: true };
}

/** Post a specific pending installment now (manual, outside the simulation).
 *  Reduces the debt's outstanding, moves cash if linked, and links the
 *  installment to its payment. Amount is clamped to the remaining outstanding. */
export async function markInstallmentPaid(
  installmentId: string
): Promise<ActionResult> {
  const inst = await db
    .select()
    .from(debtInstallments)
    .where(eq(debtInstallments.id, installmentId))
    .get();
  if (!inst) return { ok: false, error: "Installment not found" };
  if (inst.paidPaymentId) return { ok: true }; // already paid, no-op

  const debt = await db
    .select()
    .from(debts)
    .where(eq(debts.id, inst.debtId))
    .get();
  if (!debt) return { ok: false, error: "Debt not found" };

  const { base } = await getConversionContext();
  const paidRow = await db
    .select({ paid: sql<number>`COALESCE(SUM(${debtPayments.amount}), 0)` })
    .from(debtPayments)
    .where(eq(debtPayments.debtId, debt.id))
    .get();
  const outstanding = Math.max(0, debt.principal - Number(paidRow?.paid ?? 0));
  if (outstanding <= 0)
    return { ok: false, error: "Debt already settled" };

  const { paymentId } = await postDebtPaymentCore({
    debt,
    amount: Math.min(inst.amount, outstanding),
    date: inst.dueDate,
    note: inst.note,
    recordTransaction: !!debt.accountId,
    base,
  });
  await db
    .update(debtInstallments)
    .set({ paidPaymentId: paymentId, updatedAt: new Date() })
    .where(eq(debtInstallments.id, installmentId));

  revalidateFinance();
  return { ok: true };
}

/** Undo a posted installment: delete its payment and the linked cash movement,
 *  return the installment to pending, and reopen the debt if it had settled. */
export async function revertInstallment(
  installmentId: string
): Promise<ActionResult> {
  const inst = await db
    .select()
    .from(debtInstallments)
    .where(eq(debtInstallments.id, installmentId))
    .get();
  if (!inst) return { ok: false, error: "Installment not found" };
  if (!inst.paidPaymentId) return { ok: true }; // already pending, no-op

  const paymentId = inst.paidPaymentId;
  await db.delete(transactions).where(eq(transactions.debtPaymentId, paymentId));
  await db.delete(debtPayments).where(eq(debtPayments.id, paymentId));
  await db
    .update(debtInstallments)
    .set({ paidPaymentId: null, updatedAt: new Date() })
    .where(eq(debtInstallments.id, installmentId));

  // reopen the debt if it was settled and is now under-paid again
  const debt = await db
    .select()
    .from(debts)
    .where(eq(debts.id, inst.debtId))
    .get();
  if (debt && debt.status === "settled") {
    const paidRow = await db
      .select({ paid: sql<number>`COALESCE(SUM(${debtPayments.amount}), 0)` })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debt.id))
      .get();
    if (Number(paidRow?.paid ?? 0) < debt.principal) {
      await db
        .update(debts)
        .set({ status: "open", updatedAt: new Date() })
        .where(eq(debts.id, debt.id));
    }
  }

  revalidateFinance();
  return { ok: true };
}

export async function deleteDebtPayment(
  id: string,
  debtId: string
): Promise<ActionResult> {
  // reclaim the payment's linked cash movement and unlink any installment it
  // settled, so outstanding, net worth and the schedule all stay consistent.
  await db.delete(transactions).where(eq(transactions.debtPaymentId, id));
  await db
    .update(debtInstallments)
    .set({ paidPaymentId: null, updatedAt: new Date() })
    .where(eq(debtInstallments.paidPaymentId, id));
  await db.delete(debtPayments).where(eq(debtPayments.id, id));
  // reopen if it was settled and now under-paid
  const debt = await db.select().from(debts).where(eq(debts.id, debtId)).get();
  if (debt) {
    const paidRow = await db
      .select({ paid: sql<number>`COALESCE(SUM(${debtPayments.amount}), 0)` })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId))
      .get();
    if (Number(paidRow?.paid ?? 0) < debt.principal && debt.status === "settled") {
      await db
        .update(debts)
        .set({ status: "open", updatedAt: new Date() })
        .where(eq(debts.id, debtId));
    }
  }
  revalidateFinance();
  return { ok: true };
}
