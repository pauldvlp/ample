import "server-only";

import { aiGenerate, parseJsonLoose, type AiConfig } from "@/lib/ai/provider";
import { buildFinanceContext } from "@/lib/ai/context";
import { buildAppKnowledge } from "@/lib/ai/app-knowledge";
import { getSettings } from "@/lib/data/settings";
import { getNow } from "@/lib/data/clock";
import { getAccountsWithBalances } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getDebts } from "@/lib/data/debts";
import { getGoalsWithProgress } from "@/lib/data/goals";
import { getRecurringRules } from "@/lib/data/recurring";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import {
  executeAction,
  toolCatalog,
  type AgentCtx,
  type AgentLang,
  type ExecutedAction,
} from "@/lib/ai/agent-tools";

/**
 * The conversational finance agent. Each user turn: assemble the full working
 * context (entities + a financial snapshot), ask the configured LLM for a JSON
 * plan ({message, actions}), then execute the actions against the real server
 * actions. One round per turn — the snapshot is rebuilt fresh each turn, so
 * follow-ups see what previous turns created. Names created within a single
 * turn resolve too (the context is mutated as tools run).
 *
 * `runAgent` is the one-shot (non-streaming) entry point. The streaming route
 * (`app/api/ai/agent`) reuses the exported building blocks — `planAndExecute`
 * plans + runs the tools, then `buildAnswerSystem` grounds a streamed reply.
 */

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRunResult {
  reply: string;
  actions: ExecutedAction[];
}

const MAX_ACTIONS = 30;
const MAX_HISTORY = 16;
const LANG_NAME: Record<string, string> = { es: "Spanish", en: "English" };

/** Build the mutable working context from the current database state. */
export async function buildAgentContext(): Promise<AgentCtx> {
  const [s, now, accounts, categories, debts, goals, recurring] = await Promise.all([
    getSettings(),
    getNow(),
    getAccountsWithBalances(),
    getCategories(),
    getDebts(),
    getGoalsWithProgress(),
    getRecurringRules(),
  ]);
  const lang: AgentLang = s.language === "en" ? "en" : "es";
  return {
    base: s.baseCurrency,
    locale: s.locale,
    lang,
    now,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
    })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    debts: debts.map((d) => ({
      id: d.id,
      counterparty: d.counterparty,
      name: d.name,
      kind: d.kind,
      outstanding: d.outstanding,
      status: d.status,
    })),
    goals: goals.map((g) => ({ id: g.id, name: g.name })),
    recurring: recurring.map((r) => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive,
    })),
  };
}

/** A compact, name-only listing of the user's entities so the model can resolve
 *  references without ever seeing raw ids. */
export function entitiesBlock(ctx: AgentCtx): string {
  const m = (cents: number) =>
    formatMoney(cents, { currency: ctx.base, locale: ctx.locale });
  const lines: string[] = [];

  lines.push("## Accounts");
  lines.push(
    ctx.accounts.length
      ? ctx.accounts.map((a) => `- ${a.name} (${a.type}, ${a.currency})`).join("\n")
      : "- (none — create one first)"
  );

  const expense = ctx.categories.filter((c) => c.kind === "expense");
  const income = ctx.categories.filter((c) => c.kind === "income");
  lines.push("\n## Categories");
  lines.push(
    `- expense: ${expense.map((c) => c.name).join(", ") || "(none)"}`
  );
  lines.push(`- income: ${income.map((c) => c.name).join(", ") || "(none)"}`);

  const openDebts = ctx.debts.filter((d) => d.status === "open");
  if (openDebts.length) {
    lines.push("\n## Open debts");
    for (const d of openDebts) {
      const dir = d.kind === "receivable" ? "owed to you" : "you owe";
      lines.push(
        `- ${d.counterparty}${d.name ? ` (${d.name})` : ""} — ${dir}, ${m(
          d.outstanding
        )} outstanding`
      );
    }
  }

  if (ctx.goals.length) {
    lines.push("\n## Goals");
    lines.push(ctx.goals.map((g) => `- ${g.name}`).join("\n"));
  }

  if (ctx.recurring.length) {
    lines.push("\n## Recurring rules");
    lines.push(
      ctx.recurring
        .map((r) => `- ${r.name}${r.isActive ? "" : " (paused)"}`)
        .join("\n")
    );
  }

  return lines.join("\n");
}

/** System prompt for the PLANNING step: decide which tools to run (as JSON). */
function buildSystemPrompt(
  ctx: AgentCtx,
  snapshot: string,
  recall?: string
): string {
  const langName = LANG_NAME[ctx.lang] ?? "Spanish";
  const today = formatDate(ctx.now, "yyyy-MM-dd");
  return [
    `You are Amp, Ample's personal-finance agent. You can BOTH answer questions about the`,
    `user's finances AND make changes to their data by calling tools.`,
    ``,
    `Respond with ONLY one JSON object (no prose, no markdown fences):`,
    `{"message": string, "actions": Action[]}`,
    `- "message": a concise, friendly reply to the user, written in ${langName}.`,
    `  Confirm what you did (or answer their question). Never include ids or raw JSON.`,
    `- "actions": the tools to run now, in order. Use [] when the user only asks a`,
    `  question or when you need to ask for clarification. Each action is`,
    `  {"tool": "<tool_name>", ...params}. Emit MULTIPLE actions to handle multiple`,
    `  things in one message (e.g. several transactions, or a debt + its payment).`,
    ``,
    `Rules:`,
    `- Amounts are POSITIVE numbers in MAJOR units (e.g. 50 means 50.00), never cents.`,
    `  Direction/sign is decided by the tool + type, not by you.`,
    `- The base currency is ${ctx.base}. Only set "currency" when the user clearly`,
    `  means a different one.`,
    `- Dates are "YYYY-MM-DD". Today is ${today}. Resolve relative dates yourself`,
    `  ("ayer"/"yesterday" = the day before today, "el 30" = the 30th of this month, etc.).`,
    `- Resolve accounts, categories, debts, goals and recurring rules BY NAME from the`,
    `  lists below. Never invent ids. If a needed category doesn't exist, pick the`,
    `  closest one or leave it out — OR create it first with create_category and then`,
    `  reference it by name in a later action of the SAME "actions" array (they run in order).`,
    `- If a request is ambiguous or missing something required, do NOT guess wildly:`,
    `  ask a short clarifying question in "message" and return no actions.`,
    `- There are no deletion tools on purpose. If the user wants to delete something,`,
    `  tell them to do it in the relevant screen. You may settle debts, pause recurring`,
    `  rules and change goal status (all reversible).`,
    `- Be warm and brief. Answer questions using ONLY the snapshot; never invent numbers.`,
    `- You also know how the Ample app itself works (see ABOUT THE AMPLE APP): its screens,`,
    `  settings and modes. Answer questions about the app truthfully from that section —`,
    `  e.g. simulation mode DOES exist. For capabilities that live in a screen you have no`,
    `  tool for (deleting data, entering/exiting simulation mode, changing appearance), do`,
    `  NOT invent a tool: answer in "message", point the user to the right screen, and`,
    `  return no actions. Present anything under "Roadmap" as planned, not yet available.`,
    ...(recall
      ? [
          `- OTHER CONVERSATIONS below are the user's past chats with you. Consult them only`,
          `  when this turn refers back to something discussed there; otherwise ignore them.`,
        ]
      : []),
    `- Emit at most ${MAX_ACTIONS} actions per message. If the user asks for more, do the`,
    `  most important ones and tell them to send the rest in another message.`,
    ``,
    `=== ABOUT THE AMPLE APP ===`,
    buildAppKnowledge(),
    ``,
    `=== TOOLS ===`,
    toolCatalog(),
    ``,
    `=== YOUR DATA (names to resolve against) ===`,
    entitiesBlock(ctx),
    ...(recall ? [``, `=== OTHER CONVERSATIONS ===`, recall] : []),
    ``,
    `=== FINANCIAL SNAPSHOT ===`,
    snapshot,
  ].join("\n");
}

/** A short, model-facing summary of what the tools actually did this turn. */
function executedSummary(actions: ExecutedAction[]): string {
  if (!actions.length) return "none";
  return actions
    .map((a) => {
      const tail = a.ok
        ? a.detail
          ? ` — ${a.detail}`
          : ""
        : ` — FAILED: ${a.error ?? "error"}`;
      return `[${a.ok ? "OK" : "FAIL"}] ${a.label}${tail}`;
    })
    .join("\n");
}

/**
 * System prompt for the ANSWER step (streamed). Grounds a natural-language reply
 * in the snapshot and, when tools ran this turn, confirms exactly what happened.
 */
export function buildAnswerSystem(
  ctx: AgentCtx,
  snapshot: string,
  actions: ExecutedAction[],
  recall?: string
): string {
  const langName = LANG_NAME[ctx.lang] ?? "Spanish";
  const today = formatDate(ctx.now, "yyyy-MM-dd");
  const summary = executedSummary(actions);
  return [
    `You are Amp, Ample's personal-finance assistant — warm, sharp and concrete. Reply in ${langName}.`,
    `Today is ${today}. Base currency ${ctx.base}.`,
    ``,
    `A planning step already ran for this turn and performed these actions (do NOT`,
    `re-run anything — they are already done):`,
    summary,
    ``,
    `Write the reply the user will read:`,
    `- If actions were performed, confirm clearly what changed (amounts, names) and add`,
    `  one short, relevant observation when useful. If any action FAILED, say so plainly`,
    `  and tell the user what to fix.`,
    `- If NO actions were performed and the user asked a question, answer it thoroughly`,
    `  using the snapshot: cite the real figures, compare periods, point out what stands`,
    `  out (over-budget categories, upcoming cuotas/bills, goal pace, savings rate…).`,
    `- If the request was ambiguous or missing required info, ask ONE brief clarifying`,
    `  question instead of guessing.`,
    `- If the user asks about the app itself — a feature, a setting, or a mode like`,
    `  simulation mode, or "where do I do X" — answer from ABOUT THE AMPLE APP below; it is`,
    `  authoritative, so never claim a real feature doesn't exist. Point them to the right`,
    `  screen when the action lives there, and present anything under "Roadmap" as planned`,
    `  and not yet available.`,
    ...(recall
      ? [
          `- If the user refers back to an earlier chat ("como quedamos", "el otro día",`,
          `  "mi plan de…"), use OTHER CONVERSATIONS below to recall it and continue`,
          `  naturally — you DO remember past chats. Only use them when relevant; don't`,
          `  recap them unprompted or mix them up with this conversation.`,
        ]
      : []),
    ``,
    `Rules: Use the snapshot for FIGURES — never invent numbers, and if it lacks the`,
    `answer, say so briefly. Use ABOUT THE AMPLE APP for how the app works. Be specific and`,
    `genuinely useful, not generic. Keep it tight; use short markdown (a few **bold**`,
    `figures or a small bullet list) only when it aids clarity. Never show ids or raw JSON.`,
    ``,
    `=== ABOUT THE AMPLE APP ===`,
    buildAppKnowledge(),
    ...(recall ? [``, `=== OTHER CONVERSATIONS ===`, recall] : []),
    ``,
    `=== FINANCIAL SNAPSHOT ===`,
    snapshot,
  ].join("\n");
}

interface ParsedPlan {
  message: string;
  actions: unknown[];
}

function isActionLike(v: unknown): v is Record<string, unknown> {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (typeof (v as Record<string, unknown>).tool === "string" ||
      typeof (v as Record<string, unknown>).action === "string")
  );
}

/** Tolerantly pull { message, actions } out of the model's JSON, coping with
 *  shape drift: a bare array, a singular `action`, a single un-wrapped action
 *  object, or a flat one-action plan all normalize to an actions[] array.
 *  Exported for unit tests. */
export function normalizePlan(raw: string): ParsedPlan {
  const parsed = parseJsonLoose<unknown>(raw);
  if (Array.isArray(parsed)) return { message: "", actions: parsed };
  if (!parsed || typeof parsed !== "object") return { message: "", actions: [] };
  const o = parsed as Record<string, unknown>;
  const message =
    typeof o.message === "string"
      ? o.message
      : typeof o.reply === "string"
      ? o.reply
      : typeof o.text === "string"
      ? o.text
      : "";
  const rawActions = o.actions ?? o.action ?? o.tools ?? o.tool_calls ?? o.calls;
  let actions: unknown[];
  if (Array.isArray(rawActions)) actions = rawActions;
  else if (isActionLike(rawActions)) actions = [rawActions];
  else if (rawActions == null && isActionLike(o)) actions = [o]; // flat single-action plan
  else actions = [];
  return { message, actions };
}

/** Trim history to a first-message-is-user window the size of MAX_HISTORY. */
export function windowMessages(history: AgentChatMessage[]): AiConfigMessage[] {
  const windowed = history
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_HISTORY);
  // Anthropic (and Gemini) require the first message to be a user turn — a
  // trimmed window can start on an assistant reply, so drop leading assistants.
  while (windowed.length && windowed[0].role !== "user") windowed.shift();
  return windowed.map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

interface AiConfigMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlanResult {
  message: string;
  actions: ExecutedAction[];
  ctx: AgentCtx;
  snapshot: string;
  messages: AiConfigMessage[];
  /** raw model output (empty string when there was nothing to plan) */
  raw: string;
}

/**
 * Plan (one JSON call) + execute the tools. Shared by the one-shot `runAgent`
 * and the streaming route. Rebuilds the context + snapshot fresh each turn.
 */
export async function planAndExecute(
  history: AgentChatMessage[],
  cfg: AiConfig,
  opts?: { recall?: string }
): Promise<PlanResult> {
  const ctx = await buildAgentContext();
  const snapshot = await buildFinanceContext({ recentLimit: 24 });
  const system = buildSystemPrompt(ctx, snapshot, opts?.recall);
  const messages = windowMessages(history);

  if (!messages.length)
    return { message: "", actions: [], ctx, snapshot, messages, raw: "" };

  // No `temperature`: newer Anthropic (Sonnet 5 / Opus 4.7+ / Fable 5) and
  // OpenAI (GPT-5 / o-series) models reject sampling params. JSON mode + a
  // deterministic prompt are enough. maxTokens is generous so a many-action
  // plan (up to MAX_ACTIONS) and Gemini "thinking" tokens don't truncate it.
  const raw = await aiGenerate(
    { system, messages, maxTokens: 4096, json: true },
    cfg
  );

  const plan = normalizePlan(raw);
  const executed: ExecutedAction[] = [];
  for (const action of plan.actions.slice(0, MAX_ACTIONS)) {
    executed.push(await executeAction(action, ctx));
  }

  return { message: plan.message, actions: executed, ctx, snapshot, messages, raw };
}

/** One-shot (non-streaming) agent turn. */
export async function runAgent(
  history: AgentChatMessage[],
  cfg: AiConfig
): Promise<AgentRunResult> {
  const { message, actions, raw, ctx } = await planAndExecute(history, cfg);
  if (!raw && !message && actions.length === 0) return { reply: "", actions: [] };

  // Non-empty model output that parsed to nothing usually means a truncated or
  // malformed response — tell the user instead of silently doing nothing.
  if (!message && actions.length === 0 && raw.trim().length > 0) {
    return {
      reply:
        ctx.lang === "es"
          ? "No pude procesar la respuesta completa. Intenta de nuevo o divide la petición en partes más pequeñas."
          : "I couldn't process the full response. Try again or split the request into smaller parts.",
      actions: [],
    };
  }

  return { reply: message, actions };
}
