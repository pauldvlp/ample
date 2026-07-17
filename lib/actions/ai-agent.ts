'use server';

import { db } from '@/db';
import { accounts, categories } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { getAiConfig, AiNotConfiguredError } from '@/lib/ai/provider';
import { runAgent, type AgentChatMessage } from '@/lib/ai/agent';
import { parseTransaction } from '@/lib/ai/parse';
import { createTransaction } from '@/lib/actions/transactions';
import { getConversionContext } from '@/lib/data/rates';
import { getSettings } from '@/lib/data/settings';
import { getNow } from '@/lib/data/clock';
import { formatMoney } from '@/lib/money';
import type { ExecutedAction } from '@/lib/ai/agent-tools';
import type { ActionResult } from './shared';

/**
 * The chat entry point used by both the quick-capture popover (single turn) and
 * the assistant sheet (full conversation). When AI is configured it drives the
 * tool-calling agent; when it isn't, it degrades to the offline heuristic parser
 * for a single transaction so basic capture keeps working with zero network.
 */

export interface AgentChatResult {
  reply: string;
  actions: ExecutedAction[];
  engine: 'ai' | 'local';
}

function sanitize(messages: unknown): AgentChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m): m is AgentChatMessage =>
        !!m &&
        typeof m === 'object' &&
        ((m as AgentChatMessage).role === 'user' || (m as AgentChatMessage).role === 'assistant') &&
        typeof (m as AgentChatMessage).content === 'string',
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function agentChat(messages: unknown): Promise<ActionResult<AgentChatResult>> {
  const history = sanitize(messages);
  if (!history.length) return { ok: false, error: 'empty' };

  const cfg = await getAiConfig();

  if (cfg.enabled) {
    try {
      const { reply, actions } = await runAgent(history, cfg);
      return { ok: true, data: { reply, actions, engine: 'ai' } };
    } catch (e) {
      if (e instanceof AiNotConfiguredError) {
        // fall through to offline
      } else {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'ai-error',
        };
      }
    }
  }

  // ---- offline fallback: single-transaction heuristic on the last message ----
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUser) return { ok: false, error: 'ai-disabled' };
  return offlineCapture(lastUser.content);
}

async function offlineCapture(text: string): Promise<ActionResult<AgentChatResult>> {
  const [firstAccount, cats, ctx, now, s] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(eq(accounts.isArchived, false))
      .orderBy(asc(accounts.displayOrder), asc(accounts.createdAt))
      .get(),
    db.select().from(categories),
    getConversionContext(),
    getNow(),
    getSettings(),
  ]);

  const lang = s.language === 'en' ? 'en' : 'es';
  if (!firstAccount) {
    return { ok: false, error: 'no-account' };
  }

  const parsed = parseTransaction(text, {
    categories: cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    baseCurrency: ctx.base,
    now,
  });
  if (!parsed) return { ok: false, error: 'ai-disabled' };

  const res = await createTransaction({
    accountId: firstAccount.id,
    type: parsed.type,
    amount: parsed.amount,
    currency: parsed.currency !== ctx.base ? parsed.currency : null,
    date: parsed.date,
    payee: parsed.payee,
    categoryId: parsed.categoryId,
    notes: parsed.notes,
  });

  const money = formatMoney(Math.round(parsed.amount * 100), {
    currency: parsed.currency,
    locale: s.locale,
  });
  const label =
    lang === 'es'
      ? parsed.type === 'income'
        ? 'Ingreso'
        : 'Gasto'
      : parsed.type === 'income'
        ? 'Income'
        : 'Expense';
  const who = parsed.categoryName ?? parsed.payee ?? '';
  const detail = [money, who].filter(Boolean).join(' · ');

  const action: ExecutedAction = res.ok
    ? { tool: 'create_transaction', ok: true, label, detail }
    : {
        tool: 'create_transaction',
        ok: false,
        label,
        error: res.error,
      };

  const reply =
    lang === 'es'
      ? 'Modo local: registré una transacción. Activa la IA en Ajustes para el asistente completo (varias acciones, deudas, metas y más).'
      : 'Offline mode: I logged a single transaction. Enable AI in Settings for the full assistant (multiple actions, debts, goals and more).';

  return { ok: true, data: { reply, actions: [action], engine: 'local' } };
}
