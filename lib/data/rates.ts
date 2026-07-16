import "server-only";
import { db } from "@/db";
import {
  exchangeRates,
  transactions,
  recurringRules,
  debts,
  type ExchangeRate,
} from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { getSettings } from "./settings";
import { fetchLiveRates } from "@/lib/fx";
import { CURRENCIES } from "@/lib/constants";

/** Map of quote currency -> value of 1 quote in the base currency. */
export async function getRatesMap(base: string): Promise<Record<string, number>> {
  const rows = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.base, base));
  const map: Record<string, number> = {};
  for (const r of rows) map[r.quote] = r.rate;
  return map;
}

export async function getRateRows(base: string): Promise<ExchangeRate[]> {
  return db.select().from(exchangeRates).where(eq(exchangeRates.base, base));
}

/** Base currency + its rates map — the conversion context used by actions. */
export async function getConversionContext(): Promise<{
  base: string;
  rates: Record<string, number>;
}> {
  const s = await getSettings();
  return { base: s.baseCurrency, rates: await getRatesMap(s.baseCurrency) };
}

/**
 * Base currency + a *live* rates map, fetched fresh from the FX API at call
 * time. Used when a foreign-priced recurring rule or bill is actually posted,
 * so the conversion reflects the market rate at that moment rather than
 * whatever was last saved. Falls back to the stored rates if the live fetch
 * fails (offline, API down), and opportunistically updates the stored table
 * with whatever it fetched so "last updated" stays honest.
 */
export async function getLiveConversionContext(): Promise<{
  base: string;
  rates: Record<string, number>;
}> {
  const s = await getSettings();
  const base = s.baseCurrency;
  const live = await fetchLiveRates(base);
  if (!live) return { base, rates: await getRatesMap(base) };

  for (const c of CURRENCIES) {
    const rate = live[c.code];
    if (!rate) continue;
    await db
      .insert(exchangeRates)
      .values({ base, quote: c.code, rate, source: "auto", updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [exchangeRates.base, exchangeRates.quote],
        set: { rate, source: "auto", updatedAt: new Date() },
      });
  }
  return { base, rates: live };
}

/** Foreign currencies actually in use anywhere (transactions, recurring, debts)
 *  — so the FX settings can float the ones that matter (e.g. USD) to the top. */
export async function getUsedCurrencies(): Promise<string[]> {
  const [tx, rec, dbt] = await Promise.all([
    db
      .selectDistinct({ c: transactions.originalCurrency })
      .from(transactions)
      .where(isNotNull(transactions.originalCurrency)),
    db
      .selectDistinct({ c: recurringRules.originalCurrency })
      .from(recurringRules)
      .where(isNotNull(recurringRules.originalCurrency)),
    db
      .selectDistinct({ c: debts.originalCurrency })
      .from(debts)
      .where(isNotNull(debts.originalCurrency)),
  ]);
  const set = new Set<string>();
  for (const r of [...tx, ...rec, ...dbt]) if (r.c) set.add(r.c);
  return [...set];
}
