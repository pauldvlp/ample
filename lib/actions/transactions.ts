"use server";

import { z } from "zod";
import { db } from "@/db";
import { transactions, transactionTags, TRANSACTION_TYPES, TRANSACTION_STATUS } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { toCents, convertToBase } from "@/lib/money";
import { getConversionContext } from "@/lib/data/rates";
import { newId } from "@/lib/ids";
import { revalidateFinance, type ActionResult } from "./shared";

const txSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().optional().nullable(),
  date: z.number(), // epoch ms
  payee: z.string().trim().max(120).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  status: z.enum(TRANSACTION_STATUS).default("cleared"),
  transferAccountId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional().default([]),
});

export type TransactionInput = z.input<typeof txSchema>;
type ParsedTx = z.infer<typeof txSchema>;

async function insertTransaction(v: ParsedTx): Promise<string> {
  const enteredCents = toCents(v.amount);
  const { base, rates } = await getConversionContext();
  const isForeign = !!v.currency && v.currency !== base;
  const amountCents = isForeign
    ? convertToBase(enteredCents, v.currency!, base, rates)
    : enteredCents;
  const originalAmount = isForeign ? enteredCents : null;
  const originalCurrency = isForeign ? v.currency! : null;
  const date = new Date(v.date);

  if (v.type === "transfer") {
    if (!v.transferAccountId || v.transferAccountId === v.accountId) {
      throw new Error("Transfer needs a different destination account");
    }
    const group = newId();
    const out = newId();
    const inn = newId();
    await db.insert(transactions).values([
      {
        id: out,
        accountId: v.accountId,
        type: "transfer",
        amount: -amountCents,
        date,
        payee: v.payee ?? "Transfer",
        notes: v.notes ?? null,
        status: v.status,
        categoryId: null,
        transferAccountId: v.transferAccountId,
        transferGroupId: group,
      },
      {
        id: inn,
        accountId: v.transferAccountId,
        type: "transfer",
        amount: amountCents,
        date,
        payee: v.payee ?? "Transfer",
        notes: v.notes ?? null,
        status: v.status,
        categoryId: null,
        transferAccountId: v.accountId,
        transferGroupId: group,
      },
    ]);
    return out;
  }

  const signed = v.type === "income" ? amountCents : -amountCents;
  const id = newId();
  await db.insert(transactions).values({
    id,
    accountId: v.accountId,
    type: v.type,
    amount: signed,
    currency: base,
    originalAmount,
    originalCurrency,
    date,
    payee: v.payee ?? null,
    notes: v.notes ?? null,
    status: v.status,
    categoryId: v.categoryId || null,
  });
  if (v.tagIds.length) {
    await db
      .insert(transactionTags)
      .values(v.tagIds.map((tagId) => ({ transactionId: id, tagId })));
  }
  return id;
}

export async function createTransaction(
  input: TransactionInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  try {
    const id = await insertTransaction(parsed.data);
    revalidateFinance();
    return { ok: true, data: { id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

async function deleteTxInternal(id: string) {
  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();
  if (!existing) return;
  if (existing.transferGroupId) {
    await db
      .delete(transactions)
      .where(eq(transactions.transferGroupId, existing.transferGroupId));
  } else {
    await db.delete(transactions).where(eq(transactions.id, id));
  }
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();
  if (!existing) return { ok: false, error: "Transaction not found" };

  const v = parsed.data;
  const wasTransfer = !!existing.transferGroupId;

  try {
    // Any transfer involvement, or a type change: rebuild cleanly.
    if (v.type === "transfer" || wasTransfer) {
      await deleteTxInternal(id);
      const newIdVal = await insertTransaction(v);
      revalidateFinance();
      return { ok: true, data: { id: newIdVal } };
    }

    // in-place update of a regular transaction
    const enteredCents = toCents(v.amount);
    const { base, rates } = await getConversionContext();
    const isForeign = !!v.currency && v.currency !== base;
    const amountCents = isForeign
      ? convertToBase(enteredCents, v.currency!, base, rates)
      : enteredCents;
    const signed = v.type === "income" ? amountCents : -amountCents;
    await db
      .update(transactions)
      .set({
        accountId: v.accountId,
        type: v.type,
        amount: signed,
        currency: base,
        originalAmount: isForeign ? enteredCents : null,
        originalCurrency: isForeign ? v.currency! : null,
        date: new Date(v.date),
        payee: v.payee ?? null,
        notes: v.notes ?? null,
        status: v.status,
        categoryId: v.categoryId || null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    // replace tags
    await db.delete(transactionTags).where(eq(transactionTags.transactionId, id));
    if (v.tagIds.length) {
      await db
        .insert(transactionTags)
        .values(v.tagIds.map((tagId) => ({ transactionId: id, tagId })));
    }
    revalidateFinance();
    return { ok: true, data: { id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  await deleteTxInternal(id);
  revalidateFinance();
  return { ok: true };
}

export async function bulkDeleteTransactions(
  ids: string[]
): Promise<ActionResult> {
  if (!ids.length) return { ok: true };
  // expand transfer groups
  const rows = await db
    .select({ id: transactions.id, group: transactions.transferGroupId })
    .from(transactions)
    .where(inArray(transactions.id, ids));
  const groups = rows.map((r) => r.group).filter((g): g is string => !!g);
  await db.delete(transactions).where(inArray(transactions.id, ids));
  if (groups.length) {
    await db
      .delete(transactions)
      .where(inArray(transactions.transferGroupId, groups));
  }
  revalidateFinance();
  return { ok: true };
}

export async function setTransactionStatus(
  id: string,
  status: (typeof TRANSACTION_STATUS)[number]
): Promise<ActionResult> {
  await db
    .update(transactions)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(transactions.id, id)));
  revalidateFinance();
  return { ok: true };
}
