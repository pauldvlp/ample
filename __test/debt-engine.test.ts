import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { debts, debtPayments, debtInstallments, transactions, type Debt } from '@/db/schema';
import { postDebtPaymentCore, postDueDebtInstallmentsUpTo } from '@/lib/debt-engine';
import { resetDb, seedBase, at } from './helpers';

async function makeDebt(over: Partial<typeof debts.$inferInsert> = {}): Promise<Debt> {
  await db.insert(debts).values({
    id: 'debt_1',
    kind: 'payable',
    counterparty: 'Bank',
    principal: 5000,
    currency: 'HNL',
    accountId: 'acc_cash',
    openedDate: at(2026, 1, 1),
    ...over,
  });
  const [d] = await db.select().from(debts).where(eq(debts.id, 'debt_1'));
  return d;
}

describe('postDebtPaymentCore (integration)', () => {
  beforeEach(async () => {
    await resetDb();
    await seedBase();
  });

  it('records the payment and a signed cash movement, and auto-settles when fully paid', async () => {
    const debt = await makeDebt({ principal: 5000 });

    await postDebtPaymentCore({
      debt,
      amount: 5000,
      date: at(2026, 1, 15),
      recordTransaction: true,
      base: 'HNL',
    });

    const pays = await db.select().from(debtPayments).where(eq(debtPayments.debtId, 'debt_1'));
    expect(pays).toHaveLength(1);

    const txs = await db.select().from(transactions).where(eq(transactions.debtId, 'debt_1'));
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(-5000); // payable → cash OUT
    expect(txs[0].debtPaymentId).toBe(pays[0].id);

    const [d] = await db.select().from(debts).where(eq(debts.id, 'debt_1'));
    expect(d.status).toBe('settled');
  });

  it('leaves the debt open on a partial payment', async () => {
    const debt = await makeDebt({ principal: 5000 });
    await postDebtPaymentCore({
      debt,
      amount: 2000,
      date: at(2026, 1, 15),
      recordTransaction: false,
      base: 'HNL',
    });
    const [d] = await db.select().from(debts).where(eq(debts.id, 'debt_1'));
    expect(d.status).toBe('open');
    expect(await db.select().from(transactions)).toHaveLength(0); // recordTransaction: false
  });
});

describe('postDueDebtInstallmentsUpTo (integration)', () => {
  beforeEach(async () => {
    await resetDb();
    await seedBase();
  });

  it('posts only installments due on/before the cutoff, in order', async () => {
    await makeDebt({ principal: 3000 });
    await db.insert(debtInstallments).values([
      { id: 'i1', debtId: 'debt_1', amount: 1000, dueDate: at(2026, 1, 10) },
      { id: 'i2', debtId: 'debt_1', amount: 1000, dueDate: at(2026, 2, 10) },
      { id: 'i3', debtId: 'debt_1', amount: 1000, dueDate: at(2026, 3, 10) },
    ]);

    const posted = await postDueDebtInstallmentsUpTo(at(2026, 2, 15));

    expect(posted).toBe(2); // Jan + Feb
    const paid = await db
      .select()
      .from(debtInstallments)
      .where(eq(debtInstallments.debtId, 'debt_1'));
    expect(paid.filter((i) => i.paidPaymentId != null)).toHaveLength(2);
    expect(paid.find((i) => i.id === 'i3')!.paidPaymentId).toBeNull();
  });

  it('clamps the last installment to the outstanding balance (never overpays)', async () => {
    await makeDebt({ principal: 1500 }); // only 1500 owed, but 2×1000 scheduled
    await db.insert(debtInstallments).values([
      { id: 'i1', debtId: 'debt_1', amount: 1000, dueDate: at(2026, 1, 10) },
      { id: 'i2', debtId: 'debt_1', amount: 1000, dueDate: at(2026, 2, 10) },
    ]);

    await postDueDebtInstallmentsUpTo(at(2026, 3, 1));

    const pays = await db.select().from(debtPayments).where(eq(debtPayments.debtId, 'debt_1'));
    const total = pays.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(1500); // clamped, not 2000
  });
});
