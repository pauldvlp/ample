'use server';

import fs from 'node:fs';
import { addDays } from 'date-fns';
import { db, DB_PATH } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { postDueRulesUpTo } from '@/lib/recurring-engine';
import { postDueDebtInstallmentsUpTo } from '@/lib/debt-engine';
import { postBudgetSpendUpTo } from '@/lib/budget-engine';
import { revalidateFinance, type ActionResult } from './shared';

const SINGLETON_ID = 1;
const BACKUP_PATH = DB_PATH.replace(/\.db$/, '.sim-backup.db');

/** Financial data tables to snapshot & restore. `settings` is intentionally
 *  excluded so appearance/language/theme changes made during simulation stick. */
const DATA_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'tags',
  'transaction_tags',
  'budgets',
  'goals',
  'goal_contributions',
  'recurring_rules',
  'debts',
  'debt_payments',
  'debt_installments',
  'net_worth_snapshots',
  'net_worth_snapshot_balances',
] as const;

function esc(p: string) {
  return p.replace(/'/g, "''");
}

/**
 * Enter simulation mode: snapshot the current financial data to a backup file.
 * Anything the user changes from now on is reverted when they exit.
 */
export async function enterSimulation(): Promise<ActionResult> {
  try {
    const client = db.$client;
    client.pragma('wal_checkpoint(TRUNCATE)');
    if (fs.existsSync(BACKUP_PATH)) fs.rmSync(BACKUP_PATH, { force: true });
    client.exec(`VACUUM INTO '${esc(BACKUP_PATH)}'`);
    // Start the simulated clock at "today"; the time-machine advances it.
    await db
      .update(settings)
      .set({ simulationActive: true, simDate: new Date(), updatedAt: new Date() })
      .where(eq(settings.id, SINGLETON_ID));
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to start simulation' };
  }
}

/**
 * Exit simulation mode: restore every data table from the snapshot (reverting
 * all inserts, edits and deletes made during the session), then discard it.
 */
export async function exitSimulation(): Promise<ActionResult> {
  try {
    const client = db.$client;
    if (fs.existsSync(BACKUP_PATH)) {
      client.exec(`ATTACH DATABASE '${esc(BACKUP_PATH)}' AS simbak`);
      try {
        const restore = client.transaction(() => {
          client.pragma('defer_foreign_keys = ON');
          for (const tbl of DATA_TABLES) {
            client.exec(`DELETE FROM main."${tbl}";`);
            client.exec(`INSERT INTO main."${tbl}" SELECT * FROM simbak."${tbl}";`);
          }
        });
        restore();
      } finally {
        client.exec('DETACH DATABASE simbak');
      }
      fs.rmSync(BACKUP_PATH, { force: true });
    }
    // settings is excluded from the snapshot, so clear the sim clock explicitly.
    await db
      .update(settings)
      .set({ simulationActive: false, simDate: null, updatedAt: new Date() })
      .where(eq(settings.id, SINGLETON_ID));
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to exit simulation' };
  }
}

/**
 * Time-machine: advance the simulated clock by `deltaDays` and auto-post every
 * recurring rule AND scheduled debt installment that comes due in that window,
 * so balances, debts and net worth evolve into the future. When
 * `includeBudgetSpend` is on (the default), it ALSO projects the user's budgeted
 * spending into that window — filling only the gap left after the fixed bills
 * above — so the future figures reflect real day-to-day spending instead of a
 * too-rosy "income minus fixed costs" view. Forward-only; all of it is discarded
 * on exit. Budget spend is posted LAST so it can subtract what the recurring
 * rules and installments already booked in the same categories.
 */
export async function advanceSimClock(
  deltaDays: number,
  includeBudgetSpend = true,
): Promise<ActionResult<{ date: number; posted: number }>> {
  const s = await db.select().from(settings).where(eq(settings.id, SINGLETON_ID)).get();
  if (!s?.simulationActive) {
    return { ok: false, error: 'Simulation is not active' };
  }
  const from = s.simDate ?? new Date();
  const days = Math.max(1, Math.round(deltaDays));
  const target = addDays(from, days);

  const postedRules = await postDueRulesUpTo(target);
  const postedDebts = await postDueDebtInstallmentsUpTo(target);
  const postedBudget = includeBudgetSpend ? await postBudgetSpendUpTo(from, target) : 0;

  await db
    .update(settings)
    .set({ simDate: target, updatedAt: new Date() })
    .where(eq(settings.id, SINGLETON_ID));
  revalidateFinance();
  return {
    ok: true,
    data: {
      date: target.getTime(),
      posted: postedRules + postedDebts + postedBudget,
    },
  };
}
