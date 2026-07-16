/**
 * Integration smoke test for the agent tool layer (Task 3). Runs each executor
 * against a REAL (temporary) SQLite DB and asserts the resulting rows. No LLM /
 * network involved — this validates the resolve-names → call-server-action →
 * write-DB path, the create-then-reference chaining, and cents/sign handling.
 *
 * Run: DB_FILE_NAME=/tmp/agent-test.db (migrated) tsx --tsconfig tsconfig.test.json __test/agent-smoke.mts
 */
import { db } from "@/db";
import {
  settings,
  accounts,
  categories,
  transactions,
  debts,
  debtPayments,
  goals,
  budgets,
  recurringRules,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { executeAction, type AgentCtx } from "@/lib/ai/agent-tools";
import { normalizePlan } from "@/lib/ai/agent";
import { monthKey } from "@/lib/format";

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}`, extra ?? "");
  }
}

async function seed() {
  await db.insert(settings).values({
    id: 1,
    baseCurrency: "HNL",
    locale: "es-HN",
    language: "es",
  });
  await db
    .insert(accounts)
    .values([
      { id: "acc_cash", name: "Efectivo", type: "cash", currency: "HNL", displayOrder: 0 },
      { id: "acc_bank", name: "Banco", type: "checking", currency: "HNL", displayOrder: 1 },
    ]);
  await db
    .insert(categories)
    .values([
      { id: "cat_food", name: "Comida", kind: "expense", displayOrder: 0 },
      { id: "cat_salary", name: "Salario", kind: "income", displayOrder: 1 },
    ]);
}

async function buildCtx(): Promise<AgentCtx> {
  const accs = await db.select().from(accounts);
  const cats = await db.select().from(categories);
  return {
    base: "HNL",
    locale: "es-HN",
    lang: "es",
    now: new Date("2026-07-14T12:00:00"),
    accounts: accs.map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency })),
    categories: cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    debts: [],
    goals: [],
    recurring: [],
  };
}

async function main() {
  await seed();
  const ctx = await buildCtx();

  console.log("\n[1] expense with existing category + payee");
  let r = await executeAction(
    { tool: "create_transaction", type: "expense", amount: 350, category: "Comida", payee: "Súper" },
    ctx
  );
  assert("returns ok", r.ok, r);
  let tx = await db.select().from(transactions).where(eq(transactions.payee, "Súper")).get();
  assert("amount is -35000 cents", tx?.amount === -35000, tx?.amount);
  assert("resolved category = Comida", tx?.categoryId === "cat_food", tx?.categoryId);
  assert("type expense", tx?.type === "expense");
  assert("label localized (Gasto)", r.label === "Gasto", r.label);
  assert("detail shows L + payee", !!r.detail && r.detail.includes("Súper"), r.detail);

  console.log("\n[2] create_category then reference it in SAME batch flow");
  r = await executeAction({ tool: "create_category", name: "Mascotas", kind: "expense" }, ctx);
  assert("category created ok", r.ok, r);
  assert("ctx now knows Mascotas", ctx.categories.some((c) => c.name === "Mascotas"));
  r = await executeAction(
    { tool: "create_transaction", type: "expense", amount: 200, category: "Mascotas", payee: "Vet" },
    ctx
  );
  assert("tx ok", r.ok, r);
  tx = await db.select().from(transactions).where(eq(transactions.payee, "Vet")).get();
  const petCat = await db.select().from(categories).where(eq(categories.name, "Mascotas")).get();
  assert("tx uses the newly-created category id", !!petCat && tx?.categoryId === petCat.id, {
    tx: tx?.categoryId,
    cat: petCat?.id,
  });

  console.log("\n[3] income");
  r = await executeAction(
    { tool: "create_transaction", type: "income", amount: 5000, category: "Salario", payee: "Empresa" },
    ctx
  );
  tx = await db.select().from(transactions).where(eq(transactions.payee, "Empresa")).get();
  assert("income amount +500000", tx?.amount === 500000, tx?.amount);
  assert("label Ingreso", r.label === "Ingreso", r.label);

  console.log("\n[4] transfer between accounts");
  r = await executeAction(
    { tool: "create_transaction", type: "transfer", amount: 1000, account: "Efectivo", toAccount: "Banco" },
    ctx
  );
  assert("transfer ok", r.ok, r);
  const transfers = await db.select().from(transactions).where(eq(transactions.type, "transfer"));
  assert("two legs created", transfers.length === 2, transfers.length);
  assert("legs net to zero", transfers.reduce((s, t) => s + t.amount, 0) === 0);
  assert("share a transfer group", !!transfers[0]?.transferGroupId && transfers[0].transferGroupId === transfers[1]?.transferGroupId);

  console.log("\n[5] debt (payable) + payment");
  r = await executeAction(
    { tool: "create_debt", kind: "payable", counterparty: "Juan", amount: 2000, dueDate: "2026-07-30" },
    ctx
  );
  assert("debt ok", r.ok, r);
  assert("ctx knows debt Juan", ctx.debts.some((d) => d.counterparty === "Juan"));
  const debt = await db.select().from(debts).where(eq(debts.counterparty, "Juan")).get();
  assert("principal 200000", debt?.principal === 200000, debt?.principal);
  assert("dueDate set", !!debt?.dueDate);
  r = await executeAction(
    { tool: "add_debt_payment", counterparty: "Juan", amount: 500 },
    ctx
  );
  assert("payment ok", r.ok, r);
  const paid = await db
    .select({ s: sql<number>`COALESCE(SUM(${debtPayments.amount}),0)` })
    .from(debtPayments)
    .where(eq(debtPayments.debtId, debt!.id))
    .get();
  assert("payment recorded 50000", Number(paid?.s) === 50000, paid?.s);

  console.log("\n[6] goal + contribution");
  r = await executeAction(
    { tool: "create_goal", name: "Vacaciones", targetAmount: 15000 },
    ctx
  );
  assert("goal ok", r.ok, r);
  r = await executeAction(
    { tool: "contribute_to_goal", goal: "Vacaciones", amount: 1000 },
    ctx
  );
  assert("contribution ok", r.ok, r);
  const goal = await db.select().from(goals).where(eq(goals.name, "Vacaciones")).get();
  assert("goal target 1,500,000", goal?.targetAmount === 1500000, goal?.targetAmount);
  assert("goal current 100000", goal?.currentAmount === 100000, goal?.currentAmount);

  console.log("\n[7] budget for expense category");
  r = await executeAction(
    { tool: "set_budget", category: "Comida", amount: 4000 },
    ctx
  );
  assert("budget ok", r.ok, r);
  const period = monthKey(ctx.now);
  const budget = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.categoryId, "cat_food"), eq(budgets.period, period)))
    .get();
  assert("budget amount 400000", budget?.amount === 400000, budget?.amount);

  console.log("\n[8] recurring rule");
  r = await executeAction(
    { tool: "create_recurring", name: "Netflix", type: "expense", amount: 299, frequency: "monthly", isSubscription: true },
    ctx
  );
  assert("recurring ok", r.ok, r);
  const rule = await db.select().from(recurringRules).where(eq(recurringRules.name, "Netflix")).get();
  assert("rule amount -29900", rule?.amount === -29900, rule?.amount);
  assert("rule monthly", rule?.frequency === "monthly");
  assert("rule marked subscription", rule?.isSubscription === true);

  console.log("\n[9] account resolution: omit -> first account; unknown NAME -> error (no silent misbooking)");
  r = await executeAction(
    { tool: "create_transaction", type: "expense", amount: 50, payee: "OmitAcct" },
    ctx
  );
  assert("omitted account ok", r.ok, r);
  tx = await db.select().from(transactions).where(eq(transactions.payee, "OmitAcct")).get();
  assert("omitted account booked to first account (Efectivo)", tx?.accountId === "acc_cash", tx?.accountId);
  r = await executeAction(
    { tool: "create_transaction", type: "expense", amount: 50, account: "NoExiste", payee: "BadAcct" },
    ctx
  );
  assert("unknown account name -> ok:false", !r.ok, r);
  tx = await db.select().from(transactions).where(eq(transactions.payee, "BadAcct")).get();
  assert("nothing written for unknown account", !tx, tx);

  console.log("\n[10] invalid params surface as a failed action (not a crash)");
  r = await executeAction({ tool: "create_transaction", type: "expense" }, ctx);
  assert("missing amount -> ok:false with error", !r.ok && !!r.error, r);
  r = await executeAction({ tool: "made_up_tool", foo: 1 }, ctx);
  assert("unknown tool -> ok:false", !r.ok, r);

  console.log("\n[11] name matching: word/prefix resolves, ambiguous substring rejected");
  // A colliding-substring counterparty must NOT be hit by an unrelated short name.
  await db.insert(debts).values({
    id: "debt_susana", kind: "payable", counterparty: "Susana",
    principal: 100000, currency: "HNL", openedDate: ctx.now, status: "open",
  });
  ctx.debts.push({ id: "debt_susana", counterparty: "Susana", name: null, kind: "payable", outstanding: 100000, status: "open" });
  const susanaPaidBefore = await db
    .select({ s: sql<number>`COALESCE(SUM(${debtPayments.amount}),0)` })
    .from(debtPayments).where(eq(debtPayments.debtId, "debt_susana")).get();
  r = await executeAction({ tool: "add_debt_payment", counterparty: "Ana", amount: 100 }, ctx);
  assert("paying 'Ana' does NOT resolve 'Susana' (rejected)", !r.ok, r);
  const susanaPaidAfter = await db
    .select({ s: sql<number>`COALESCE(SUM(${debtPayments.amount}),0)` })
    .from(debtPayments).where(eq(debtPayments.debtId, "debt_susana")).get();
  assert("Susana debt untouched", Number(susanaPaidBefore?.s) === Number(susanaPaidAfter?.s), {
    before: susanaPaidBefore?.s, after: susanaPaidAfter?.s,
  });
  // Prefix/word match: "BAC" resolves "Banco BAC" (added now, unambiguous vs "Banco").
  await db.insert(accounts).values({ id: "acc_bac", name: "Banco BAC", type: "checking", currency: "HNL", displayOrder: 5 });
  ctx.accounts.push({ id: "acc_bac", name: "Banco BAC", type: "checking", currency: "HNL" });
  r = await executeAction({ tool: "create_transaction", type: "expense", amount: 10, account: "BAC", payee: "WordMatch" }, ctx);
  assert("word match 'BAC' -> 'Banco BAC'", r.ok, r);
  tx = await db.select().from(transactions).where(eq(transactions.payee, "WordMatch")).get();
  assert("booked on Banco BAC", tx?.accountId === "acc_bac", tx?.accountId);

  console.log("\n[12] normalizePlan copes with model JSON shape drift");
  let p = normalizePlan('{"message":"hi","actions":[{"tool":"create_transaction","type":"expense","amount":5}]}');
  assert("standard {message,actions[]}", p.message === "hi" && p.actions.length === 1, p);
  p = normalizePlan('{"message":"ok","actions":{"tool":"create_transaction","type":"expense","amount":5}}');
  assert("single action object under actions -> [obj]", p.message === "ok" && p.actions.length === 1, p);
  p = normalizePlan('{"tool":"create_transaction","type":"expense","amount":5,"message":"ok"}');
  assert("flat single-action plan -> 1 action", p.message === "ok" && p.actions.length === 1, p);
  p = normalizePlan('{"message":"x","action":{"tool":"create_goal","name":"a","targetAmount":1}}');
  assert("singular `action` object key", p.message === "x" && p.actions.length === 1, p);
  p = normalizePlan('{"message":"just answering, no action","actions":[]}');
  assert("pure Q&A keeps message, 0 actions", p.message.startsWith("just") && p.actions.length === 0, p);
  p = normalizePlan('[{"tool":"create_transaction","type":"expense","amount":5}]');
  assert("bare array -> actions", p.message === "" && p.actions.length === 1, p);
  p = normalizePlan("not json at all");
  assert("garbage -> empty plan", p.message === "" && p.actions.length === 0, p);

  console.log(`\n${failures === 0 ? "ALL PASSED ✅" : `${failures} FAILURE(S) ❌`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(2);
});
