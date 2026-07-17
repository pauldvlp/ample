/**
 * Offline natural-language transaction parser.
 *
 * Turns free text like "Gasté $50 en el super" or "Recibí 1200 de salario"
 * into a structured transaction suggestion, with zero network dependency. It is
 * intentionally a transparent heuristic (regex + keyword maps) so it works
 * fully local; `lib/actions/ai.ts` wraps it and can be upgraded to call an LLM
 * when an API key is present without changing any callers.
 */

import { currencySymbol } from '@/lib/money';

export interface ParseCategory {
  id: string;
  name: string;
  kind: string;
}

export interface ParseContext {
  categories: ParseCategory[];
  baseCurrency: string;
  now: Date;
}

export interface ParsedTransaction {
  type: 'income' | 'expense';
  /** major units (e.g. 50.0) */
  amount: number;
  currency: string;
  categoryId: string | null;
  categoryName: string | null;
  payee: string | null;
  date: number; // epoch ms
  notes: string;
  /** 0..1 rough confidence that we understood the input */
  confidence: number;
}

const SYMBOL_TO_CODE: Record<string, string> = {
  L: 'HNL',
  Q: 'GTQ',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₡': 'CRC',
  R$: 'BRL',
  Fr: 'CHF',
};

const WORD_TO_CODE: Array<[RegExp, string]> = [
  [/\b(usd|d[oó]lares?|dollars?|bucks?)\b/i, 'USD'],
  [/\b(hnl|lempiras?|lps?)\b/i, 'HNL'],
  [/\b(eur|euros?)\b/i, 'EUR'],
  [/\b(gbp|pounds?|libras?)\b/i, 'GBP'],
  [/\b(gtq|quetzales?)\b/i, 'GTQ'],
  [/\b(crc|colones?)\b/i, 'CRC'],
  [/\b(mxn|pesos?)\b/i, 'MXN'],
];

const INCOME_HINT =
  /\b(recib[íi]|ingres[oó]s?|ingres[eé]|salario|sueldo|me pagaron|cobr[eé]|cobro|dep[oó]sito|reembolso|received|salary|refund|income|paid me|got paid)\b/i;

// keyword -> canonical category name (matched case-insensitively against the
// user's actual categories of the resolved kind)
const CATEGORY_HINTS: Array<{ re: RegExp; name: string; kind: 'expense' | 'income' }> = [
  {
    re: /\b(super|supermercado|mercado|groceries?|abarrotes)\b/i,
    name: 'Groceries',
    kind: 'expense',
  },
  {
    re: /\b(comida|restaurante|almuerzo|cena|desayuno|dining|lunch|dinner|caf[eé]|coffee|pizza|burger)\b/i,
    name: 'Dining',
    kind: 'expense',
  },
  { re: /\b(gasolina|combustible|fuel|gas|nafta)\b/i, name: 'Fuel', kind: 'expense' },
  {
    re: /\b(uber|taxi|bus|transporte|transport|pasaje|metro)\b/i,
    name: 'Transport',
    kind: 'expense',
  },
  { re: /\b(renta|alquiler|rent|housing|hogar|casa)\b/i, name: 'Housing', kind: 'expense' },
  {
    re: /\b(luz|agua|internet|utilities|servicios|electricidad|cable)\b/i,
    name: 'Utilities',
    kind: 'expense',
  },
  { re: /\b(ropa|clothes|shopping|compras?|zapatos|tienda)\b/i, name: 'Shopping', kind: 'expense' },
  {
    re: /\b(salud|doctor|m[eé]dico|farmacia|health|pharmacy|medicina)\b/i,
    name: 'Health',
    kind: 'expense',
  },
  {
    re: /\b(netflix|spotify|subscription|suscripci[oó]n|hbo|disney|prime)\b/i,
    name: 'Subscriptions',
    kind: 'expense',
  },
  { re: /\b(gym|gimnasio|fitness|ejercicio)\b/i, name: 'Fitness', kind: 'expense' },
  {
    re: /\b(cine|movie|pel[íi]cula|entertainment|juego|game)\b/i,
    name: 'Entertainment',
    kind: 'expense',
  },
  { re: /\b(viaje|travel|vuelo|flight|hotel|airbnb)\b/i, name: 'Travel', kind: 'expense' },
  { re: /\b(salario|sueldo|salary|payroll|n[oó]mina)\b/i, name: 'Salary', kind: 'income' },
  { re: /\b(freelance|proyecto|gig|cliente)\b/i, name: 'Freelance', kind: 'income' },
  { re: /\b(inter[eé]s|interest|dividendo|dividend)\b/i, name: 'Interest', kind: 'income' },
  { re: /\b(regalo|gift|bono|bonus)\b/i, name: 'Gifts', kind: 'income' },
];

function parseAmount(text: string): { amount: number; matchIndex: number } | null {
  // capture an optional currency symbol immediately before the number
  const re = /(R\$|Fr|kr|[$€£¥₡LQ])?\s?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/;
  const m = re.exec(text);
  if (!m) return null;
  let raw = m[2];
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  if (hasComma && hasDot) {
    // the last separator is the decimal one
    const dec = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? ',' : '.';
    const thou = dec === ',' ? '.' : ',';
    raw = raw.split(thou).join('').replace(dec, '.');
  } else if (hasComma) {
    // "1,50" -> decimal; "1,500" -> thousands
    raw = /,\d{3}\b/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
  } else if (hasDot) {
    raw = /\.\d{3}\b/.test(raw) ? raw.replace(/\./g, '') : raw;
  }
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, matchIndex: m.index };
}

function detectCurrency(text: string, base: string): string {
  // Explicit words ("dólares", "lempiras", "euros") are unambiguous.
  for (const [re, code] of WORD_TO_CODE) if (re.test(text)) return code;
  // A bare symbol is ambiguous ($ is USD, MXN, ARS, COP, CLP, CAD, AUD…), so
  // prefer the user's base currency whenever it shares that symbol. Only fall
  // back to the "canonical" code (USD, HNL…) when the base uses a different one.
  const baseSym = currencySymbol(base);
  if (/\$/.test(text)) return baseSym === '$' ? base : 'USD';
  for (const [sym, code] of Object.entries(SYMBOL_TO_CODE)) {
    if (text.includes(sym)) return baseSym === sym ? base : code;
  }
  return base;
}

function detectDate(text: string, now: Date): number {
  const d = new Date(now);
  if (/\b(ayer|yesterday)\b/i.test(text)) d.setDate(d.getDate() - 1);
  else if (/\b(antier|anteayer)\b/i.test(text)) d.setDate(d.getDate() - 2);
  return d.getTime();
}

function detectPayee(text: string): string | null {
  const m = /\b(?:en|at|para|to|from|de)\s+([\p{L}0-9&'.\- ]{2,40})/iu.exec(text);
  if (!m) return null;
  // stop at connectors and trim trailing filler
  let p = m[1].split(/\b(?:por|for|con|and|y|el|la|los|las|de)\b/i)[0].trim();
  p = p.replace(/[.,;:]+$/, '').trim();
  if (p.length < 2) return null;
  // Title-case single-word brands
  return p.length <= 30 ? p : p.slice(0, 30);
}

export function parseTransaction(text: string, ctx: ParseContext): ParsedTransaction | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const amt = parseAmount(trimmed);
  if (!amt) return null;

  const type: 'income' | 'expense' = INCOME_HINT.test(trimmed) ? 'income' : 'expense';
  const currency = detectCurrency(trimmed, ctx.baseCurrency);
  const date = detectDate(trimmed, ctx.now);

  // category match: keyword hint -> user's category of the same kind
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  const ofKind = ctx.categories.filter((c) => c.kind === type);
  for (const hint of CATEGORY_HINTS) {
    if (hint.kind !== type) continue;
    if (!hint.re.test(trimmed)) continue;
    const match = ofKind.find((c) => c.name.toLowerCase() === hint.name.toLowerCase());
    if (match) {
      categoryId = match.id;
      categoryName = match.name;
      break;
    }
  }
  // fallback: a category name appears verbatim in the text
  if (!categoryId) {
    const direct = ofKind.find((c) =>
      new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(trimmed),
    );
    if (direct) {
      categoryId = direct.id;
      categoryName = direct.name;
    }
  }

  const payee = detectPayee(trimmed);

  let confidence = 0.4;
  if (categoryId) confidence += 0.3;
  if (payee) confidence += 0.15;
  if (currency !== ctx.baseCurrency || /\$|€|£|L|Q/.test(trimmed)) confidence += 0.15;

  return {
    type,
    amount: amt.amount,
    currency,
    categoryId,
    categoryName,
    payee,
    date,
    notes: trimmed,
    confidence: Math.min(1, confidence),
  };
}
