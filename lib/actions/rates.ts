'use server';

import { db } from '@/db';
import { exchangeRates } from '@/db/schema';
import { getSettings } from '@/lib/data/settings';
import { getT } from '@/lib/i18n/server';
import { CURRENCIES } from '@/lib/constants';
import { fetchLiveRates } from '@/lib/fx';
import { revalidateFinance, type ActionResult } from './shared';

/** Fetch fresh rates from the internet for the current base currency. */
export async function refreshRates(): Promise<ActionResult<{ updated: number }>> {
  const { baseCurrency: base } = await getSettings();
  const t = await getT();
  const live = await fetchLiveRates(base);
  if (!live) return { ok: false, error: t('fx.network') };
  let updated = 0;
  for (const c of CURRENCIES) {
    if (c.code === base) continue;
    const rate = live[c.code];
    if (!rate) continue;
    await db
      .insert(exchangeRates)
      .values({ base, quote: c.code, rate, source: 'auto', updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [exchangeRates.base, exchangeRates.quote],
        set: { rate, source: 'auto', updatedAt: new Date() },
      });
    updated++;
  }
  revalidateFinance();
  return { ok: true, data: { updated } };
}

/** Manually set the rate for one currency (base per 1 quote). */
export async function setManualRate(quote: string, rate: number): Promise<ActionResult> {
  const { baseCurrency: base } = await getSettings();
  if (!Number.isFinite(rate) || rate <= 0) {
    const t = await getT();
    return { ok: false, error: t('fx.invalidRate') };
  }
  await db
    .insert(exchangeRates)
    .values({ base, quote, rate, source: 'manual', updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [exchangeRates.base, exchangeRates.quote],
      set: { rate, source: 'manual', updatedAt: new Date() },
    });
  revalidateFinance();
  return { ok: true };
}
