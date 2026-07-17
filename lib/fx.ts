import 'server-only';

/** Free, key-less FX endpoint (supports HNL and ~160 currencies). */
export const FX_ENDPOINT = (base: string) => `https://open.er-api.com/v6/latest/${base}`;

/**
 * Fetch live rates for `base` from the internet. Returns a map of
 * `quote -> value of 1 quote in base`, or `null` on any failure (network,
 * bad response) so callers can fall back to a cached value.
 */
export async function fetchLiveRates(base: string): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(FX_ENDPOINT(base), { cache: 'no-store' });
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data.result !== 'success' || !data.rates) return null;
    const rates: Record<string, number> = {};
    for (const [quote, quotePerBase] of Object.entries(data.rates)) {
      if (quote === base || !quotePerBase || quotePerBase <= 0) continue;
      rates[quote] = 1 / quotePerBase; // base per 1 quote
    }
    return rates;
  } catch {
    return null;
  }
}
