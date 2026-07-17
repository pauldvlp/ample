'use server';

import { z } from 'zod';
import { db } from '@/db';
import { settings, AI_PROVIDERS, type AiProvider } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { verifyAiKey, listAvailableModels } from '@/lib/ai/provider';
import { getSettings } from '@/lib/data/settings';
import type { ActionResult } from './shared';

const SINGLETON_ID = 1;

const configSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(AI_PROVIDERS).nullable(),
  // empty string = keep the existing key (so the UI never has to echo it back)
  apiKey: z.string().trim().optional(),
  model: z.string().trim().nullable().optional(),
});

export type AiConfigInput = z.infer<typeof configSchema>;

/**
 * Persist the AI configuration. The API key is stored server-side only and is
 * never returned to the client. Passing an empty `apiKey` keeps the stored one.
 */
export async function saveAiConfig(
  input: AiConfigInput,
): Promise<ActionResult<{ enabled: boolean }>> {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { enabled, provider, apiKey, model } = parsed.data;

  const current = await getSettings();
  const nextKey = apiKey && apiKey.length > 0 ? apiKey : (current.aiApiKey ?? null);

  if (enabled && (!provider || !nextKey)) {
    return { ok: false, error: 'missing-key' };
  }

  await db
    .update(settings)
    .set({
      aiEnabled: enabled,
      aiProvider: provider,
      aiApiKey: nextKey,
      aiModel: model && model.length > 0 ? model : null,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, SINGLETON_ID));

  revalidatePath('/', 'layout');
  return { ok: true, data: { enabled } };
}

/** Test a provider + key (uses the stored key when `apiKey` is blank). */
export async function testAiConnection(input: {
  provider: AiProvider;
  apiKey?: string;
  model?: string | null;
}): Promise<ActionResult> {
  const current = await getSettings();
  const key = input.apiKey && input.apiKey.length > 0 ? input.apiKey : (current.aiApiKey ?? '');
  if (!key) return { ok: false, error: 'missing-key' };
  const res = await verifyAiKey(input.provider, key, input.model ?? undefined);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** List the models the stored (or provided) key can actually use. */
export async function fetchAiModels(input: {
  provider: AiProvider;
  apiKey?: string;
}): Promise<ActionResult<{ models: string[] }>> {
  const current = await getSettings();
  const key = input.apiKey && input.apiKey.length > 0 ? input.apiKey : (current.aiApiKey ?? '');
  if (!key) return { ok: false, error: 'missing-key' };
  try {
    const models = await listAvailableModels(input.provider, key);
    return { ok: true, data: { models } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error' };
  }
}

/** Whether an API key is already stored (so the UI can show "key saved"). */
export async function hasAiKey(): Promise<boolean> {
  const s = await getSettings();
  return !!s.aiApiKey;
}

/** Mark the guided product tour as completed. */
export async function completeTour(): Promise<ActionResult> {
  await db
    .update(settings)
    .set({ tourCompleted: true, updatedAt: new Date() })
    .where(eq(settings.id, SINGLETON_ID));
  return { ok: true };
}
