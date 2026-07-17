import 'server-only';

import { db } from '@/db';
import { chatThreads, chatMessages, type ChatMessage } from '@/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import type { ExecutedAction } from '@/lib/ai/agent-tools';

/**
 * Persistence for the AI assistant's conversation history. Reads power the
 * history panel + a thread's transcript; the write helpers are used by the
 * streaming route to record each turn (see app/api/ai/agent/route.ts). Kept
 * out of lib/data (reads-only by convention) because it owns both sides for
 * one tightly-scoped feature.
 */

const TITLE_MAX = 80;

export interface ThreadSummary {
  id: string;
  /** Empty string until the first user turn names the thread. */
  title: string;
  updatedAt: number; // epoch ms
}

export interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions: ExecutedAction[] | null;
  error: boolean;
  createdAt: number; // epoch ms
}

/** First line of a message, collapsed + trimmed to a thread-title length. */
function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1)}…` : clean;
}

/* -------------------------------- reads ----------------------------------- */

/** Threads for the history panel, most-recent activity first. */
export async function listThreads(limit = 60): Promise<ThreadSummary[]> {
  const rows = await db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .orderBy(desc(chatThreads.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    title: r.title?.trim() || '',
    updatedAt: r.updatedAt.getTime(),
  }));
}

function toMessage(r: ChatMessage): ThreadMessage {
  let actions: ExecutedAction[] | null = null;
  if (r.actions) {
    try {
      const parsed = JSON.parse(r.actions) as unknown;
      if (Array.isArray(parsed) && parsed.length) actions = parsed as ExecutedAction[];
    } catch {
      actions = null;
    }
  }
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    actions,
    error: r.error,
    createdAt: r.createdAt.getTime(),
  };
}

/** All messages in a thread, oldest first. Empty when the thread is unknown. */
export async function getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
  return rows.map(toMessage);
}

export async function threadExists(id: string): Promise<boolean> {
  const row = await db
    .select({ id: chatThreads.id })
    .from(chatThreads)
    .where(eq(chatThreads.id, id))
    .get();
  return !!row;
}

/* -------------------------------- writes ---------------------------------- */

/** Create an empty thread and return its id. */
export async function createThread(): Promise<string> {
  const row = await db.insert(chatThreads).values({}).returning({ id: chatThreads.id }).get();
  return row.id;
}

export interface AppendInput {
  role: 'user' | 'assistant';
  content: string;
  actions?: ExecutedAction[] | null;
  error?: boolean;
}

/**
 * Append one message to a thread, bump its updatedAt so it floats to the top of
 * the history, and name the thread from its first user message while untitled.
 * Returns the thread's (possibly just-derived) title for the client.
 */
export async function appendMessage(
  threadId: string,
  msg: AppendInput,
): Promise<{ title: string }> {
  const actions = msg.actions && msg.actions.length ? JSON.stringify(msg.actions) : null;

  await db.insert(chatMessages).values({
    threadId,
    role: msg.role,
    content: msg.content,
    actions,
    error: msg.error ?? false,
  });

  const current = await db
    .select({ title: chatThreads.title })
    .from(chatThreads)
    .where(eq(chatThreads.id, threadId))
    .get();

  let title = current?.title?.trim() ?? '';
  if (!title && msg.role === 'user') title = deriveTitle(msg.content);

  await db
    .update(chatThreads)
    .set({ updatedAt: new Date(), ...(title ? { title } : {}) })
    .where(eq(chatThreads.id, threadId));

  return { title };
}

/** Delete a thread; its messages cascade. */
export async function deleteThread(id: string): Promise<void> {
  await db.delete(chatThreads).where(eq(chatThreads.id, id));
}

/** Clear the entire conversation history. */
export async function deleteAllThreads(): Promise<void> {
  await db.delete(chatThreads);
}

/** Rename a thread (empty clears back to auto-derived-on-next-turn). */
export async function renameThread(id: string, title: string): Promise<void> {
  const clean = deriveTitle(title);
  await db
    .update(chatThreads)
    .set({ title: clean || null, updatedAt: new Date() })
    .where(eq(chatThreads.id, id));
}
