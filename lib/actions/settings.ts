'use server';

import { db } from '@/db';
import { settings, type AiProvider } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const SINGLETON_ID = 1;

export interface SettingsPatch {
  baseCurrency?: string;
  locale?: string;
  language?: 'es' | 'en';
  theme?: 'light' | 'dark' | 'system';
  firstDayOfWeek?: number;
  budgetStartDay?: number;
  hideAmounts?: boolean;
  uiFont?: string;
  uiScale?: number;
  iconStroke?: number;
  displayName?: string;
  onboardingCompleted?: boolean;
  tourCompleted?: boolean;
  aiEnabled?: boolean;
  aiProvider?: AiProvider | null;
  aiApiKey?: string | null;
  aiModel?: string | null;
}

export async function updateSettings(patch: SettingsPatch) {
  await db
    .insert(settings)
    .values({ id: SINGLETON_ID, ...patch })
    .onConflictDoUpdate({
      target: settings.id,
      set: { ...patch, updatedAt: new Date() },
    });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function setHideAmounts(hideAmounts: boolean) {
  await db
    .update(settings)
    .set({ hideAmounts, updatedAt: new Date() })
    .where(eq(settings.id, SINGLETON_ID));
  // no revalidate: this is a client-optimistic toggle
  return { ok: true };
}
