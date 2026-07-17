'use server';

import { z } from 'zod';
import {
  deleteThread as removeThread,
  deleteAllThreads,
  getThreadMessages,
  renameThread as setThreadTitle,
  type ThreadMessage,
} from '@/lib/ai/threads';
import { fail, type ActionResult } from './shared';

/**
 * Client-facing thread mutations + a read wrapper for switching threads without
 * a full page navigation. These deliberately do NOT call revalidateFinance():
 * chat threads don't feed any finance screen, and the /assistant route is
 * force-dynamic, so it re-reads the history fresh on every load anyway.
 */

const idSchema = z.string().min(1);

/** Load a thread's transcript so the client can switch threads in place. */
export async function loadThread(id: string): Promise<ActionResult<{ messages: ThreadMessage[] }>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail('Invalid thread');
  const messages = await getThreadMessages(parsed.data);
  return { ok: true, data: { messages } };
}

export async function deleteThread(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail('Invalid thread');
  await removeThread(parsed.data);
  return { ok: true };
}

export async function clearAllThreads(): Promise<ActionResult> {
  await deleteAllThreads();
  return { ok: true };
}

export async function renameThread(id: string, title: string): Promise<ActionResult> {
  const parsed = z
    .object({ id: z.string().min(1), title: z.string().max(200) })
    .safeParse({ id, title });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid data');
  await setThreadTitle(parsed.data.id, parsed.data.title);
  return { ok: true };
}
