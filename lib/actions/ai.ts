"use server";

import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { toCents, convertToBase } from "@/lib/money";
import { getConversionContext } from "@/lib/data/rates";
import { getSettings } from "@/lib/data/settings";
import { getNow } from "@/lib/data/clock";
import { newId } from "@/lib/ids";
import { parseTransaction, type ParsedTransaction } from "@/lib/ai/parse";
import {
  aiGenerate,
  getAiConfig,
  parseJsonLoose,
  AiNotConfiguredError,
} from "@/lib/ai/provider";
import { buildFinanceContext } from "@/lib/ai/context";
import { revalidateFinance, type ActionResult } from "./shared";

export interface QuickAddResult {
  amountCents: number; // base-currency signed cents
  type: "income" | "expense";
  currency: string;
  categoryName: string | null;
  payee: string | null;
  date: number;
  confidence: number;
  /** which engine parsed it — surfaced in the UI */
  engine: "ai" | "local";
}

const LANG_NAME: Record<string, string> = { es: "Spanish", en: "English" };

/* -------------------------------------------------------------------------- */
/*  Quick add (natural language → transaction)                                */
/* -------------------------------------------------------------------------- */

export async function quickAddTransaction(
  text: string
): Promise<ActionResult<QuickAddResult>> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "empty" };

  const [firstAccount, cats, ctx, now, aiCfg] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(eq(accounts.isArchived, false))
      .orderBy(asc(accounts.displayOrder), asc(accounts.createdAt))
      .get(),
    db.select().from(categories),
    getConversionContext(),
    getNow(),
    getAiConfig(),
  ]);

  if (!firstAccount) return { ok: false, error: "no-account" };

  const catList = cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));

  let parsed: ParsedTransaction | null = null;
  let engine: "ai" | "local" = "local";

  // Prefer the configured LLM; fall back to the offline heuristic on any error.
  if (aiCfg.enabled) {
    try {
      parsed = await aiExtractTransaction(trimmed, {
        categories: catList,
        baseCurrency: ctx.base,
        now,
      });
      if (parsed) engine = "ai";
    } catch {
      parsed = null;
    }
  }
  if (!parsed) {
    try {
      parsed = parseTransaction(trimmed, {
        categories: catList,
        baseCurrency: ctx.base,
        now,
      });
    } catch {
      parsed = null;
    }
  }
  if (!parsed) return { ok: false, error: "unparsed" };

  const isForeign = parsed.currency !== ctx.base;
  const enteredCents = toCents(parsed.amount);
  const baseCents = isForeign
    ? convertToBase(enteredCents, parsed.currency, ctx.base, ctx.rates)
    : enteredCents;
  const signed = parsed.type === "income" ? baseCents : -baseCents;

  await db.insert(transactions).values({
    id: newId(),
    accountId: firstAccount.id,
    categoryId: parsed.categoryId,
    type: parsed.type,
    amount: signed,
    currency: ctx.base,
    originalAmount: isForeign ? enteredCents : null,
    originalCurrency: isForeign ? parsed.currency : null,
    date: new Date(parsed.date),
    payee: parsed.payee,
    notes: parsed.notes,
    status: "cleared",
  });

  revalidateFinance();
  return {
    ok: true,
    data: {
      amountCents: signed,
      type: parsed.type,
      currency: parsed.currency,
      categoryName: parsed.categoryName,
      payee: parsed.payee,
      date: parsed.date,
      confidence: parsed.confidence,
      engine,
    },
  };
}

/** LLM extraction → the same ParsedTransaction shape the heuristic produces. */
async function aiExtractTransaction(
  text: string,
  ctx: {
    categories: { id: string; name: string; kind: string }[];
    baseCurrency: string;
    now: Date;
  }
): Promise<ParsedTransaction | null> {
  const catNames = ctx.categories.map((c) => `${c.name} (${c.kind})`).join(", ");
  const today = ctx.now.toISOString().slice(0, 10);
  const system =
    "You extract a single personal-finance transaction from the user's short " +
    "message and return STRICT JSON only. Infer sign from wording (spending = " +
    "expense, receiving = income).";
  const prompt =
    `Today is ${today}. Base currency: ${ctx.baseCurrency}.\n` +
    `Available categories: ${catNames || "(none)"}.\n\n` +
    `Message: """${text}"""\n\n` +
    `Return JSON with exactly these keys:\n` +
    `{"type":"income|expense","amount":<positive number in major units>,` +
    `"currency":"<ISO 4217 code, default ${ctx.baseCurrency}>",` +
    `"category":"<one of the available category names, matching the type, or null>",` +
    `"payee":"<merchant or source name, or null>",` +
    `"date":"<YYYY-MM-DD, default today>"}`;

  const raw = await aiGenerate({
    system,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 300,
    json: true,
    temperature: 0,
  });

  const obj = parseJsonLoose<{
    type?: string;
    amount?: number | string;
    currency?: string;
    category?: string | null;
    payee?: string | null;
    date?: string | null;
  }>(raw);
  if (!obj) return null;

  const amount = Number(obj.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const type: "income" | "expense" =
    obj.type === "income" ? "income" : "expense";
  const currency = (obj.currency || ctx.baseCurrency).toUpperCase().slice(0, 3);

  // resolve the category name to an id of the right kind
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  if (obj.category) {
    const match = ctx.categories.find(
      (c) =>
        c.kind === type &&
        c.name.toLowerCase() === String(obj.category).toLowerCase()
    );
    if (match) {
      categoryId = match.id;
      categoryName = match.name;
    }
  }

  let date = ctx.now.getTime();
  if (obj.date) {
    const parsed = new Date(`${obj.date}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) date = parsed.getTime();
  }

  return {
    type,
    amount,
    currency,
    categoryId,
    categoryName,
    payee: obj.payee ? String(obj.payee).slice(0, 60) : null,
    date,
    notes: text,
    confidence: 0.95,
  };
}

/* -------------------------------------------------------------------------- */
/*  Insights: monthly summary + advice                                        */
/* -------------------------------------------------------------------------- */

export type InsightKind = "summary" | "advice";

export async function generateInsight(
  kind: InsightKind
): Promise<ActionResult<{ text: string }>> {
  const cfg = await getAiConfig();
  if (!cfg.enabled) return { ok: false, error: "ai-disabled" };

  const s = await getSettings();
  const lang = LANG_NAME[s.language] ?? "English";
  const context = await buildFinanceContext();

  const system =
    kind === "summary"
      ? `You are a warm, concise personal-finance narrator. Write a short ` +
        `natural-language recap (about 90-140 words) of the user's month using ` +
        `the data provided. Lead with the headline (net worth / cash flow), ` +
        `mention 1-2 notable categories or changes, and end on an encouraging ` +
        `but honest note. No markdown headings, no bullet lists, no invented ` +
        `numbers. Write in ${lang}.`
      : `You are a pragmatic personal-finance coach. Using ONLY the data ` +
        `provided, give 3-5 specific, actionable tips as a short markdown ` +
        `bullet list: flag over-budget categories, comment on savings rate and ` +
        `goal pace, and suggest concrete next steps. Reference real figures. ` +
        `Do not invent data. Be encouraging and specific. Write in ${lang}.`;

  try {
    const text = await aiGenerate({
      system,
      messages: [
        {
          role: "user",
          content: `Here is my financial snapshot:\n\n${context}`,
        },
      ],
      maxTokens: 700,
      // no temperature: newer Anthropic/OpenAI models reject sampling params.
    });
    return { ok: true, data: { text: text.trim() } };
  } catch (e) {
    if (e instanceof AiNotConfiguredError)
      return { ok: false, error: "ai-disabled" };
    return {
      ok: false,
      error: e instanceof Error ? e.message : "ai-error",
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Translate category names to the UI language                               */
/* -------------------------------------------------------------------------- */

/**
 * Bulk-translate every (non-archived) category name into `targetLang` using the
 * configured LLM, so categories adapt to the user's language without renaming
 * each by hand. Names already in the target language are left as-is. This is
 * reversible: run it again toward the other language.
 */
export async function translateCategories(
  targetLang: "es" | "en"
): Promise<ActionResult<{ updated: number }>> {
  const cfg = await getAiConfig();
  if (!cfg.enabled) return { ok: false, error: "ai-disabled" };

  const langName = LANG_NAME[targetLang] ?? "English";
  const cats = await db.select().from(categories);
  const active = cats.filter((c) => !c.isArchived);
  if (!active.length) return { ok: true, data: { updated: 0 } };

  const items = active.map((c) => ({ id: c.id, name: c.name }));
  const system =
    `You translate personal-finance category names to ${langName}. Keep each ` +
    `short (1-3 words), natural and in Title Case. If a name is already in ` +
    `${langName}, return it unchanged. Return ONLY JSON.`;
  const prompt =
    `Translate these category names to ${langName}. Return exactly: ` +
    `{"translations":[{"id":"<id>","name":"<translated name>"}, ...]} ` +
    `covering every id.\n\n${JSON.stringify(items)}`;

  let raw: string;
  try {
    raw = await aiGenerate({
      system,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2000,
      json: true,
      // no temperature: newer Anthropic/OpenAI models reject sampling params.
    });
  } catch (e) {
    if (e instanceof AiNotConfiguredError)
      return { ok: false, error: "ai-disabled" };
    return { ok: false, error: e instanceof Error ? e.message : "ai-error" };
  }

  const parsed = parseJsonLoose<{
    translations?: { id: string; name: string }[];
  }>(raw);
  const list = parsed?.translations;
  if (!Array.isArray(list)) return { ok: false, error: "parse" };

  let updated = 0;
  for (const p of list) {
    if (!p?.id || !p?.name) continue;
    const cur = active.find((c) => c.id === p.id);
    if (!cur) continue;
    const newName = String(p.name).trim().slice(0, 60);
    if (newName && newName !== cur.name) {
      await db
        .update(categories)
        .set({ name: newName, updatedAt: new Date() })
        .where(eq(categories.id, p.id));
      updated++;
    }
  }

  revalidateFinance();
  return { ok: true, data: { updated } };
}
