"use server";

import fs from "node:fs";
import { eq } from "drizzle-orm";
import { db, DB_PATH } from "@/db";
import {
  accounts,
  budgets,
  categories,
  debtPayments,
  debts,
  goalContributions,
  goals,
  netWorthSnapshotBalances,
  netWorthSnapshots,
  payees,
  recurringRules,
  settings,
  tags,
  transactions,
  transactionTags,
} from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { newId } from "@/lib/ids";
import { revalidateFinance, type ActionResult } from "./shared";

const SINGLETON_ID = 1;
const SIM_BACKUP_PATH = DB_PATH.replace(/\.db$/, ".sim-backup.db");

/**
 * Permanently erase every piece of financial data — accounts, transactions,
 * budgets, goals, debts, recurring rules, payees and net-worth history — then
 * re-seed the default categories so the app returns to a fresh, usable baseline
 * (the same starting point as a brand-new install, minus the demo data).
 *
 * Intentionally KEPT: the `settings` singleton (name, currency, locale, theme,
 * language, AI config) and `exchange_rates` (a shared reference table). Any
 * active time-machine simulation is force-exited first, because its on-disk
 * snapshot would otherwise point at the data we just deleted.
 */
export async function resetAllData(): Promise<
  ActionResult<{ categories: number }>
> {
  try {
    const seedCategories = DEFAULT_CATEGORIES.map((c, i) => ({
      id: newId(),
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      isSystem: true,
      displayOrder: i,
    }));

    // Single synchronous transaction on the better-sqlite3 connection.
    // defer_foreign_keys lets us wipe in any order without tripping FKs, then
    // the default categories are re-inserted before the transaction commits.
    const client = db.$client;
    const run = client.transaction(() => {
      client.pragma("defer_foreign_keys = ON");
      db.delete(transactionTags).run();
      db.delete(netWorthSnapshotBalances).run();
      db.delete(netWorthSnapshots).run();
      db.delete(goalContributions).run();
      db.delete(goals).run();
      db.delete(debtPayments).run();
      db.delete(debts).run();
      db.delete(budgets).run();
      db.delete(recurringRules).run();
      db.delete(transactions).run();
      db.delete(categories).run();
      db.delete(accounts).run();
      db.delete(tags).run();
      db.delete(payees).run();
      db.insert(categories).values(seedCategories).run();
    });
    run();

    // Discard any simulation snapshot + clear its clock: it references data that
    // no longer exists, so "exit simulation" must not resurrect it.
    if (fs.existsSync(SIM_BACKUP_PATH)) {
      fs.rmSync(SIM_BACKUP_PATH, { force: true });
    }
    await db
      .update(settings)
      .set({ simulationActive: false, simDate: null, updatedAt: new Date() })
      .where(eq(settings.id, SINGLETON_ID));

    revalidateFinance();
    return { ok: true, data: { categories: seedCategories.length } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to reset data",
    };
  }
}
