/**
 * Runtime check for the rich AI finance context. Seeds a realistic throwaway DB
 * (accounts + balances, budgets, goals, recurring rules, and — crucially — a
 * payable debt WITH an installment plan/cuotas) and prints buildFinanceContext()
 * so we can eyeball that debts, cuotas, recurring and per-account balances all
 * reach the model. No LLM / network. Asserts a few must-haves.
 */
import { db } from "@/db";
import {
  settings,
  accounts,
  categories,
  transactions,
  budgets,
  goals,
  goalContributions,
  recurringRules,
  debts,
  debtPayments,
  debtInstallments,
} from "@/db/schema";
import { buildFinanceContext } from "@/lib/ai/context";
import { monthKey } from "@/lib/format";

const now = new Date();
const dayMs = 86_400_000;
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * dayMs);

async function seed() {
  await db.insert(settings).values({
    id: 1,
    baseCurrency: "HNL",
    locale: "es-HN",
    language: "es",
    displayName: "Pau",
  });

  await db.insert(accounts).values([
    { id: "acc_cash", name: "Efectivo", type: "cash", currency: "HNL", startingBalance: 250000, displayOrder: 0 },
    { id: "acc_bank", name: "Banco BAC", type: "checking", currency: "HNL", startingBalance: 1850000, displayOrder: 1 },
    { id: "acc_usd", name: "Ahorros USD", type: "savings", currency: "USD", startingBalance: 900000, displayOrder: 2 },
    { id: "acc_card", name: "Tarjeta BAC", type: "credit", currency: "HNL", startingBalance: -320000, creditLimit: 1000000, displayOrder: 3 },
  ]);

  await db.insert(categories).values([
    { id: "cat_food", name: "Comida", kind: "expense", displayOrder: 0 },
    { id: "cat_trans", name: "Transporte", kind: "expense", displayOrder: 1 },
    { id: "cat_home", name: "Casa", kind: "expense", displayOrder: 2 },
    { id: "cat_salary", name: "Salario", kind: "income", displayOrder: 3 },
  ]);

  // A few transactions this month to drive cash flow / budgets / top categories.
  await db.insert(transactions).values([
    { id: "tx1", accountId: "acc_bank", categoryId: "cat_salary", type: "income", amount: 4500000, currency: "HNL", date: d(-10) },
    { id: "tx2", accountId: "acc_card", categoryId: "cat_food", type: "expense", amount: -180000, currency: "HNL", date: d(-3), payee: "Súper La Colonia" },
    { id: "tx3", accountId: "acc_cash", categoryId: "cat_trans", type: "expense", amount: -60000, currency: "HNL", date: d(-2), payee: "Uber" },
    { id: "tx4", accountId: "acc_bank", categoryId: "cat_home", type: "expense", amount: -900000, currency: "HNL", date: d(-1), payee: "Renta" },
    { id: "tx5", accountId: "acc_card", categoryId: "cat_food", type: "expense", amount: -95000, currency: "HNL", date: d(0), payee: "Baleadas Express" },
  ]);

  await db.insert(budgets).values([
    { id: "b1", categoryId: "cat_food", period: monthKey(now), amount: 250000 },
    { id: "b2", categoryId: "cat_trans", period: monthKey(now), amount: 150000 },
  ]);

  await db.insert(goals).values({
    id: "goal_vac", name: "Vacaciones Roatán", targetAmount: 3000000, currentAmount: 900000, targetDate: d(180), status: "active", priority: 0,
  });
  await db.insert(goalContributions).values([
    { id: "gc1", goalId: "goal_vac", amount: 300000, date: d(-40) },
    { id: "gc2", goalId: "goal_vac", amount: 300000, date: d(-12) },
  ]);

  await db.insert(recurringRules).values([
    { id: "r_netflix", name: "Netflix", accountId: "acc_card", categoryId: "cat_home", type: "expense", amount: -29900, frequency: "monthly", interval: 1, nextDueDate: d(8), isSubscription: true, autoPost: true, isActive: true },
    { id: "r_rent", name: "Renta", accountId: "acc_bank", categoryId: "cat_home", type: "expense", amount: -900000, frequency: "monthly", interval: 1, nextDueDate: d(20), isActive: true },
    { id: "r_salary", name: "Salario", accountId: "acc_bank", categoryId: "cat_salary", type: "income", amount: 4500000, frequency: "monthly", interval: 1, nextDueDate: d(20), isActive: true },
  ]);

  // ---- The headline: a payable debt WITH an installment plan (cuotas) --------
  await db.insert(debts).values([
    { id: "debt_car", kind: "payable", counterparty: "Banco Atlántida", name: "Préstamo carro", principal: 6000000, currency: "HNL", openedDate: d(-120), dueDate: d(160), status: "open", includeInNetWorth: true },
    { id: "debt_juan", kind: "receivable", counterparty: "Juan", name: null, principal: 200000, currency: "HNL", openedDate: d(-20), dueDate: d(10), status: "open", includeInNetWorth: true },
  ]);
  // Two cuotas already paid (each backed by a debt_payments row + paidPaymentId).
  await db.insert(debtPayments).values([
    { id: "pay1", debtId: "debt_car", amount: 500000, date: d(-90) },
    { id: "pay2", debtId: "debt_car", amount: 500000, date: d(-60) },
  ]);
  await db.insert(debtInstallments).values([
    { id: "cu1", debtId: "debt_car", amount: 500000, dueDate: d(-90), paidPaymentId: "pay1" },
    { id: "cu2", debtId: "debt_car", amount: 500000, dueDate: d(-60), paidPaymentId: "pay2" },
    { id: "cu3", debtId: "debt_car", amount: 500000, dueDate: d(-2), paidPaymentId: null }, // OVERDUE
    { id: "cu4", debtId: "debt_car", amount: 500000, dueDate: d(28), paidPaymentId: null },
    { id: "cu5", debtId: "debt_car", amount: 500000, dueDate: d(58), paidPaymentId: null },
    { id: "cu6", debtId: "debt_car", amount: 500000, dueDate: d(88), paidPaymentId: null },
  ]);
}

function assert(name: string, cond: boolean) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  await seed();
  const ctx = await buildFinanceContext();
  console.log("\n========== buildFinanceContext() ==========\n");
  console.log(ctx);
  console.log("\n===========================================\n");

  assert("includes per-account balance (Banco BAC)", /Banco BAC/.test(ctx));
  assert("flags foreign-held account (USD)", /held in USD/.test(ctx));
  assert("includes credit utilization", /utilization/i.test(ctx));
  assert("includes full budget line", /Comida/.test(ctx) && /Budget/.test(ctx));
  assert("includes goals with pace", /Vacaciones Roatán/.test(ctx));
  assert("includes recurring rules + subscription total", /Recurring rules/.test(ctx) && /Netflix/.test(ctx));
  assert("includes monthly trend", /Monthly trend/.test(ctx));
  assert("includes Debts & loans section", /Debts & loans/.test(ctx));
  assert("includes the debt counterparty + reason", /Banco Atlántida/.test(ctx) && /Préstamo carro/.test(ctx));
  assert("includes the installment plan (cuotas)", /cuotas/.test(ctx));
  assert("flags an OVERDUE cuota", /OVERDUE/.test(ctx) && /overdue/.test(ctx));
  assert("includes recent transactions", /Recent transactions/.test(ctx) && /Baleadas Express/.test(ctx));

  console.log(process.exitCode ? "\nSOME CHECKS FAILED ❌" : "\nALL CONTEXT CHECKS PASSED ✅");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(2);
});
