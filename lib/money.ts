/**
 * Money helpers. All monetary values move through the app as SIGNED INTEGER
 * CENTS (minor units) to avoid floating point drift. Convert to/from major
 * units only at the UI edge.
 */

export function toCents(major: number): number {
  return Math.round(major * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Convert an amount (minor units) from `fromCurrency` into the base currency
 * using a rates map where `rates[quote]` = value of 1 unit of quote in base.
 * Falls back to 1:1 when the currency matches base or no rate is known.
 */
export function convertToBase(
  amountMinor: number,
  fromCurrency: string,
  baseCurrency: string,
  rates: Record<string, number>
): number {
  if (!fromCurrency || fromCurrency === baseCurrency) return amountMinor;
  const rate = rates[fromCurrency];
  if (!rate || rate <= 0) return amountMinor;
  return Math.round(amountMinor * rate);
}

/**
 * Static currency glyphs, keyed by ISO code. `Intl`'s "narrowSymbol" for
 * less-common currencies (e.g. HNL) is resolved from the runtime's bundled
 * ICU data, which differs between Node (SSR) and mobile browser engines —
 * that mismatch is what causes a visible flash from "L" to "HNL" on some
 * phones as client hydration overwrites the server-rendered glyph. Using a
 * fixed table instead of `currencyDisplay: "narrowSymbol"` keeps the glyph
 * identical across every environment.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "$",
  AUD: "$",
  CHF: "CHF",
  CNY: "¥",
  INR: "₹",
  MXN: "$",
  HNL: "L",
  GTQ: "Q",
  CRC: "₡",
  BRL: "R$",
  ARS: "$",
  COP: "$",
  CLP: "$",
  SEK: "kr",
  NOK: "kr",
  NZD: "$",
  SGD: "$",
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(key: string, factory: () => Intl.NumberFormat) {
  let f = formatterCache.get(key);
  if (!f) {
    f = factory();
    formatterCache.set(key, f);
  }
  return f;
}

export interface FormatMoneyOptions {
  currency?: string;
  locale?: string;
  /** show cents (2 fraction digits). Default true. */
  cents?: boolean;
  /** compact notation: $1.2K, $3.4M */
  compact?: boolean;
  /** force a leading + for positive values */
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
}

export function formatMoney(
  amountCents: number,
  {
    currency = "USD",
    locale = "en-US",
    cents = true,
    compact = false,
    signDisplay = "auto",
  }: FormatMoneyOptions = {}
): string {
  const value = amountCents / 100;
  const key = `m:${locale}:${currency}:${cents}:${compact}:${signDisplay}`;
  const fmt = getFormatter(key, () =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      // Use the ISO code for layout (position/spacing are stable across ICU
      // versions) and swap in our own glyph below — see CURRENCY_SYMBOLS.
      currencyDisplay: "code",
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: compact ? 0 : cents ? 2 : 0,
      maximumFractionDigits: compact ? 1 : cents ? 2 : 0,
      signDisplay,
    })
  );
  try {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return fmt
      .formatToParts(value)
      .map((part) => (part.type === "currency" ? symbol : part.value))
      .join("");
  } catch {
    // invalid currency code fallback
    return `${value.toFixed(cents ? 2 : 0)} ${currency}`;
  }
}

/** Absolute value formatting — useful when the sign is conveyed by color/arrow. */
export function formatMoneyAbs(
  amountCents: number,
  opts: FormatMoneyOptions = {}
): string {
  return formatMoney(Math.abs(amountCents), opts);
}

export function formatNumber(
  value: number,
  { locale = "en-US", compact = false, maximumFractionDigits = 1 } = {}
): string {
  const key = `n:${locale}:${compact}:${maximumFractionDigits}`;
  const fmt = getFormatter(key, () =>
    new Intl.NumberFormat(locale, {
      notation: compact ? "compact" : "standard",
      maximumFractionDigits,
    })
  );
  return fmt.format(value);
}

export function formatPercent(
  ratio: number,
  {
    locale = "en-US",
    maximumFractionDigits = 0,
    signDisplay = "auto",
  }: {
    locale?: string;
    maximumFractionDigits?: number;
    signDisplay?: "auto" | "always" | "exceptZero" | "never";
  } = {}
): string {
  const key = `p:${locale}:${maximumFractionDigits}:${signDisplay}`;
  const fmt = getFormatter(key, () =>
    new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits,
      signDisplay,
    })
  );
  return fmt.format(ratio);
}

/** Short currency symbol for a code (e.g. USD -> $, HNL -> L, GTQ -> Q). */
export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}
