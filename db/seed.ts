/**
 * Seed Ample with a rich, believable 8-month financial history so every screen
 * looks alive on first run. Run with `npm run db:seed`.
 *
 * Uses its own better-sqlite3 connection (not @/db) so it doesn't pull in the
 * `server-only` guard when executed under tsx.
 */
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  addMonths,
  setDate,
  startOfMonth,
  endOfMonth,
  isBefore,
  isAfter,
  format,
} from "date-fns";
import * as schema from "./schema";
import { DEFAULT_CATEGORIES } from "../lib/constants";
import { newId } from "../lib/ids";

const DB_PATH =
  process.env.DB_FILE_NAME ?? path.join(process.cwd(), "data", "ample.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle({ client: sqlite, schema });

/* ------------------------------- helpers ---------------------------------- */
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rnd(a, b + 1));
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];
const cents = (major: number) => Math.round(major * 100);
const chance = (p: number) => Math.random() < p;

const MONTHS_BACK = 8;
const now = new Date();
const historyStart = startOfMonth(addMonths(now, -MONTHS_BACK));

async function reset() {
  // wipe (respect FK order via cascade / manual)
  sqlite.exec(`
    DELETE FROM net_worth_snapshot_balances;
    DELETE FROM net_worth_snapshots;
    DELETE FROM goal_contributions;
    DELETE FROM goals;
    DELETE FROM recurring_rules;
    DELETE FROM transaction_tags;
    DELETE FROM transactions;
    DELETE FROM budgets;
    DELETE FROM tags;
    DELETE FROM categories;
    DELETE FROM accounts;
    DELETE FROM settings;
  `);
}

async function main() {
  await reset();

  /* settings */
  await db.insert(schema.settings).values({
    id: 1,
    baseCurrency: "USD",
    locale: "en-US",
    theme: "system",
    displayName: "Ample",
    onboardingCompleted: true,
  });

  /* categories */
  const catRows = DEFAULT_CATEGORIES.map((c, i) => ({
    id: newId(),
    name: c.name,
    kind: c.kind,
    icon: c.icon,
    color: c.color,
    isSystem: true,
    displayOrder: i,
  }));
  await db.insert(schema.categories).values(catRows);
  const cat = (name: string) => {
    const c = catRows.find((r) => r.name === name);
    if (!c) throw new Error(`category not found: ${name}`);
    return c.id;
  };

  /* accounts (starting balances are balances as of history start) */
  const accounts = [
    { key: "checking", id: newId(), name: "Everyday Checking", type: "checking" as const, institution: "Meridian Bank", start: cents(2850), icon: "Wallet", color: "#2C6152" },
    { key: "savings", id: newId(), name: "High-Yield Savings", type: "savings" as const, institution: "Meridian Bank", start: cents(12400), icon: "PiggyBank", color: "#4C9C86" },
    { key: "emergency", id: newId(), name: "Emergency Fund", type: "savings" as const, institution: "Ally", start: cents(8600), icon: "ShieldCheck", color: "#5B8CA0" },
    { key: "credit", id: newId(), name: "Amex Gold", type: "credit" as const, institution: "American Express", start: cents(0), creditLimit: cents(15000), icon: "CreditCard", color: "#C8A24E" },
    { key: "cash", id: newId(), name: "Cash Wallet", type: "cash" as const, start: cents(650), icon: "Banknote", color: "#B08968" },
    { key: "brokerage", id: newId(), name: "Brokerage", type: "investment" as const, institution: "Fidelity", start: cents(28500), icon: "TrendingUp", color: "#3E8C74" },
    { key: "loan", id: newId(), name: "Auto Loan", type: "loan" as const, institution: "Meridian Auto", start: cents(-16800), icon: "Landmark", color: "#9A6A5C" },
  ];
  await db.insert(schema.accounts).values(
    accounts.map((a, i) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      institution: a.institution,
      startingBalance: a.start,
      creditLimit: a.creditLimit,
      icon: a.icon,
      color: a.color,
      displayOrder: i,
    }))
  );
  const acc = (key: string) => accounts.find((a) => a.key === key)!.id;

  /* tags */
  const tagDefs = [
    { name: "essential", color: "#2C6152" },
    { name: "reimbursable", color: "#C8A24E" },
    { name: "tax-deductible", color: "#5B8CA0" },
    { name: "one-off", color: "#9A6A5C" },
    { name: "wishlist", color: "#8A6F8E" },
  ];
  const tagRows = tagDefs.map((t) => ({ id: newId(), ...t }));
  await db.insert(schema.tags).values(tagRows);
  const tag = (name: string) => tagRows.find((t) => t.name === name)!.id;

  /* transactions */
  type TxSeed = typeof schema.transactions.$inferInsert;
  const txs: TxSeed[] = [];
  const txTags: { transactionId: string; tagId: string }[] = [];

  const merchants: Record<string, string[]> = {
    Groceries: ["Whole Foods", "Trader Joe's", "Costco", "Safeway", "Local Market"],
    Dining: ["Blue Bottle", "Sushi Ko", "Taqueria El Sol", "Olive & Vine", "Ramen Bar", "Corner Bistro", "Pizzeria Uno"],
    Transport: ["Uber", "Lyft", "Metro Transit", "City Parking"],
    Fuel: ["Shell", "Chevron", "BP"],
    Shopping: ["Amazon", "Uniqlo", "IKEA", "Best Buy", "Muji"],
    Health: ["City Pharmacy", "Dr. Nguyen", "Dental Care"],
    Entertainment: ["Cineplex", "Steam", "Ticketmaster", "The Comedy Club"],
    "Personal Care": ["The Barber Co", "Glow Spa"],
    Utilities: ["City Power & Light", "Aqua Utilities"],
    Travel: ["Delta Airlines", "Airbnb", "Marriott"],
    Education: ["Coursera", "O'Reilly", "MasterClass"],
    Pets: ["Petco", "The Vet"],
  };

  const addTx = (t: Partial<TxSeed> & { accountId: string; amount: number; date: Date }, tags?: string[]) => {
    const id = newId();
    txs.push({
      id,
      type: t.amount >= 0 ? "income" : "expense",
      status: "cleared",
      currency: "USD",
      ...t,
    } as TxSeed);
    tags?.forEach((tg) => txTags.push({ transactionId: id, tagId: tag(tg) }));
    return id;
  };

  const addTransfer = (fromId: string, toId: string, amount: number, date: Date, payee: string) => {
    const group = newId();
    addTx({ accountId: fromId, amount: -Math.abs(amount), date, payee, type: "transfer", categoryId: null, transferAccountId: toId, transferGroupId: group });
    addTx({ accountId: toId, amount: Math.abs(amount), date, payee, type: "transfer", categoryId: null, transferAccountId: fromId, transferGroupId: group });
  };

  // month-by-month generation
  for (let m = 0; m <= MONTHS_BACK; m++) {
    const monthDate = addMonths(historyStart, m);
    const monthStart = startOfMonth(monthDate);
    if (isAfter(monthStart, now)) break;
    const clamp = (d: Date) => (isAfter(d, now) ? now : d);
    const day = (n: number) => clamp(setDate(monthStart, Math.min(n, 28)));

    // income — salary
    addTx({ accountId: acc("checking"), categoryId: cat("Salary"), amount: cents(rnd(4750, 4900)), date: day(1), payee: "Northwind Studios", type: "income" }, ["essential"]);
    // occasional freelance
    if (chance(0.5)) addTx({ accountId: acc("checking"), categoryId: cat("Freelance"), amount: cents(rnd(300, 1200)), date: day(randInt(8, 20)), payee: "Freelance Client", type: "income" }, ["tax-deductible"]);
    // interest
    addTx({ accountId: acc("savings"), categoryId: cat("Interest"), amount: cents(rnd(28, 44)), date: day(28), payee: "Interest", type: "income" });

    // housing / rent
    addTx({ accountId: acc("checking"), categoryId: cat("Housing"), amount: -cents(1650), date: day(3), payee: "Sterling Property Mgmt" }, ["essential"]);
    // utilities
    addTx({ accountId: acc("checking"), categoryId: cat("Utilities"), amount: -cents(rnd(95, 175)), date: day(9), payee: pick(merchants.Utilities) }, ["essential"]);
    addTx({ accountId: acc("checking"), categoryId: cat("Utilities"), amount: -cents(rnd(45, 70)), date: day(9), payee: "FiberNet Internet" }, ["essential"]);

    // subscriptions (on credit card)
    addTx({ accountId: acc("credit"), categoryId: cat("Subscriptions"), amount: -cents(15.99), date: day(12), payee: "Netflix" });
    addTx({ accountId: acc("credit"), categoryId: cat("Subscriptions"), amount: -cents(10.99), date: day(14), payee: "Spotify" });
    addTx({ accountId: acc("credit"), categoryId: cat("Subscriptions"), amount: -cents(2.99), date: day(5), payee: "iCloud+" });
    addTx({ accountId: acc("credit"), categoryId: cat("Fitness"), amount: -cents(45), date: day(6), payee: "Iron & Oak Gym" });
    addTx({ accountId: acc("credit"), categoryId: cat("Utilities"), amount: -cents(45), date: day(15), payee: "Cellular One" }, ["essential"]);

    // groceries
    for (let i = 0; i < randInt(4, 6); i++) {
      addTx({ accountId: acc("credit"), categoryId: cat("Groceries"), amount: -cents(rnd(28, 145)), date: day(randInt(2, 27)), payee: pick(merchants.Groceries) }, chance(0.3) ? ["essential"] : undefined);
    }
    // dining
    for (let i = 0; i < randInt(5, 11); i++) {
      addTx({ accountId: chance(0.85) ? acc("credit") : acc("cash"), categoryId: cat("Dining"), amount: -cents(rnd(9, 78)), date: day(randInt(1, 28)), payee: pick(merchants.Dining) });
    }
    // transport & fuel
    for (let i = 0; i < randInt(2, 5); i++) addTx({ accountId: acc("credit"), categoryId: cat("Transport"), amount: -cents(rnd(6, 34)), date: day(randInt(1, 28)), payee: pick(merchants.Transport) });
    if (chance(0.7)) addTx({ accountId: acc("credit"), categoryId: cat("Fuel"), amount: -cents(rnd(38, 72)), date: day(randInt(5, 25)), payee: pick(merchants.Fuel) });
    // shopping
    for (let i = 0; i < randInt(1, 4); i++) addTx({ accountId: acc("credit"), categoryId: cat("Shopping"), amount: -cents(rnd(18, 240)), date: day(randInt(1, 28)), payee: pick(merchants.Shopping) }, chance(0.25) ? ["wishlist"] : undefined);
    // occasional buckets
    if (chance(0.6)) addTx({ accountId: acc("credit"), categoryId: cat("Entertainment"), amount: -cents(rnd(12, 90)), date: day(randInt(1, 28)), payee: pick(merchants.Entertainment) });
    if (chance(0.4)) addTx({ accountId: acc("credit"), categoryId: cat("Health"), amount: -cents(rnd(15, 180)), date: day(randInt(1, 28)), payee: pick(merchants.Health) });
    if (chance(0.35)) addTx({ accountId: acc("credit"), categoryId: cat("Personal Care"), amount: -cents(rnd(25, 85)), date: day(randInt(1, 28)), payee: pick(merchants["Personal Care"]) });
    if (chance(0.25)) addTx({ accountId: acc("credit"), categoryId: cat("Education"), amount: -cents(rnd(15, 60)), date: day(randInt(1, 28)), payee: pick(merchants.Education) }, ["tax-deductible"]);
    if (chance(0.2)) addTx({ accountId: acc("credit"), categoryId: cat("Pets"), amount: -cents(rnd(20, 120)), date: day(randInt(1, 28)), payee: pick(merchants.Pets) });
    if (chance(0.18)) addTx({ accountId: acc("credit"), categoryId: cat("Travel"), amount: -cents(rnd(120, 780)), date: day(randInt(1, 28)), payee: pick(merchants.Travel) }, ["one-off"]);

    // loan payment (real transfer: checking → loan, pays down the liability)
    addTransfer(acc("checking"), acc("loan"), cents(320), day(18), "Auto Loan Payment");

    // transfers: savings + investing + emergency top-up
    addTransfer(acc("checking"), acc("savings"), cents(500), day(2), "Monthly Savings");
    addTransfer(acc("checking"), acc("brokerage"), cents(600), day(4), "Auto-Invest");
    if (chance(0.5)) addTransfer(acc("checking"), acc("emergency"), cents(250), day(20), "Emergency Top-up");

    // ATM withdrawal to keep the cash wallet topped up
    addTransfer(acc("checking"), acc("cash"), cents(rnd(80, 160)), day(randInt(5, 22)), "ATM Withdrawal");

    // pay off credit card near month end (transfer from checking)
    addTransfer(acc("checking"), acc("credit"), cents(rnd(900, 1500)), day(26), "Amex Payment");
  }

  // insert transactions in chunks
  const chunk = 200;
  for (let i = 0; i < txs.length; i += chunk) {
    await db.insert(schema.transactions).values(txs.slice(i, i + chunk));
  }
  if (txTags.length) {
    for (let i = 0; i < txTags.length; i += chunk) {
      await db.insert(schema.transactionTags).values(txTags.slice(i, i + chunk));
    }
  }

  /* budgets — current + 2 previous months */
  const budgetTargets: [string, number][] = [
    ["Housing", 1650], ["Groceries", 620], ["Dining", 360], ["Utilities", 240],
    ["Transport", 150], ["Fuel", 80], ["Shopping", 280], ["Entertainment", 120],
    ["Subscriptions", 90], ["Fitness", 45], ["Health", 130], ["Personal Care", 90],
  ];
  const budgetRows: (typeof schema.budgets.$inferInsert)[] = [];
  for (let m = 0; m < 3; m++) {
    const period = format(addMonths(now, -m), "yyyy-MM");
    for (const [name, amount] of budgetTargets) {
      budgetRows.push({ id: newId(), categoryId: cat(name), period, amount: cents(amount), rolloverEnabled: name === "Shopping" });
    }
  }
  await db.insert(schema.budgets).values(budgetRows);

  /* goals */
  const goalDefs = [
    { name: "Emergency Fund", target: 20000, current: 9100, account: "emergency", icon: "ShieldCheck", color: "#5B8CA0", date: addMonths(now, 5) },
    { name: "Japan Trip", target: 5000, current: 2350, account: "savings", icon: "Plane", color: "#4C9C86", date: addMonths(now, 6) },
    { name: "New Laptop", target: 2500, current: 2100, account: "savings", icon: "Laptop", color: "#C8A24E", date: addMonths(now, 2) },
    { name: "Home Down Payment", target: 60000, current: 18500, account: "brokerage", icon: "Home", color: "#2C6152", date: addMonths(now, 30) },
  ];
  const goalRows = goalDefs.map((g, i) => ({
    id: newId(),
    name: g.name,
    targetAmount: cents(g.target),
    currentAmount: cents(g.current),
    targetDate: g.date,
    accountId: acc(g.account),
    icon: g.icon,
    color: g.color,
    priority: i,
    status: "active" as const,
  }));
  await db.insert(schema.goals).values(goalRows);

  // goal contributions history (monthly)
  const contribRows: (typeof schema.goalContributions.$inferInsert)[] = [];
  for (const g of goalRows) {
    const monthly = Math.round(g.currentAmount / (MONTHS_BACK + 1));
    for (let m = 0; m <= MONTHS_BACK; m++) {
      contribRows.push({ id: newId(), goalId: g.id, amount: monthly, date: addMonths(historyStart, m), note: "Monthly contribution" });
    }
  }
  await db.insert(schema.goalContributions).values(contribRows);

  /* recurring rules */
  const nextDom = (dom: number) => {
    const d = setDate(now, dom);
    return isBefore(d, now) ? setDate(addMonths(now, 1), dom) : d;
  };
  const recurring = [
    { name: "Salary", account: "checking", category: "Salary", type: "income" as const, amount: 4800, dom: 1, sub: false },
    { name: "Rent", account: "checking", category: "Housing", type: "expense" as const, amount: -1650, dom: 3, sub: false },
    { name: "Netflix", account: "credit", category: "Subscriptions", type: "expense" as const, amount: -15.99, dom: 12, sub: true },
    { name: "Spotify", account: "credit", category: "Subscriptions", type: "expense" as const, amount: -10.99, dom: 14, sub: true },
    { name: "iCloud+", account: "credit", category: "Subscriptions", type: "expense" as const, amount: -2.99, dom: 5, sub: true },
    { name: "Iron & Oak Gym", account: "credit", category: "Fitness", type: "expense" as const, amount: -45, dom: 6, sub: true },
    { name: "FiberNet Internet", account: "checking", category: "Utilities", type: "expense" as const, amount: -60, dom: 9, sub: true },
    { name: "Cellular One", account: "credit", category: "Utilities", type: "expense" as const, amount: -45, dom: 15, sub: true },
    { name: "Auto-Invest", account: "checking", category: "Investments", type: "expense" as const, amount: -600, dom: 4, sub: false },
  ];
  await db.insert(schema.recurringRules).values(
    recurring.map((r) => ({
      id: newId(),
      name: r.name,
      accountId: acc(r.account),
      categoryId: cat(r.category),
      type: r.type,
      amount: cents(r.amount),
      payee: r.name,
      frequency: "monthly" as const,
      interval: 1,
      startDate: historyStart,
      nextDueDate: nextDom(r.dom),
      autoPost: false,
      isSubscription: r.sub,
      isActive: true,
    }))
  );

  /* net worth snapshots (monthly, computed from cumulative flows) */
  // running balance per account
  const balances = new Map<string, number>();
  accounts.forEach((a) => balances.set(a.id, a.start));
  const sortedTx = [...txs].sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
  let txIdx = 0;
  const snapshotRows: (typeof schema.netWorthSnapshots.$inferInsert)[] = [];
  const snapBalanceRows: (typeof schema.netWorthSnapshotBalances.$inferInsert)[] = [];
  for (let m = 0; m <= MONTHS_BACK; m++) {
    const boundary = endOfMonth(addMonths(historyStart, m));
    const cutoff = isAfter(boundary, now) ? now : boundary;
    while (txIdx < sortedTx.length && !isAfter(sortedTx[txIdx].date as Date, cutoff)) {
      const t = sortedTx[txIdx];
      balances.set(t.accountId, (balances.get(t.accountId) ?? 0) + (t.amount as number));
      txIdx++;
    }
    let assets = 0;
    let liabilities = 0;
    const snapId = newId();
    for (const a of accounts) {
      const bal = balances.get(a.id) ?? 0;
      if (bal >= 0) assets += bal;
      else liabilities += -bal;
      snapBalanceRows.push({ id: newId(), snapshotId: snapId, accountId: a.id, balance: bal });
    }
    snapshotRows.push({
      id: snapId,
      date: cutoff,
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities,
      source: "scheduled",
    });
  }
  await db.insert(schema.netWorthSnapshots).values(snapshotRows);
  await db.insert(schema.netWorthSnapshotBalances).values(snapBalanceRows);

  console.log(
    `[ample] seeded: ${catRows.length} categories, ${accounts.length} accounts, ${txs.length} transactions, ${budgetRows.length} budgets, ${goalRows.length} goals, ${recurring.length} recurring rules, ${snapshotRows.length} snapshots.`
  );
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
