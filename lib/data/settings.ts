import 'server-only';
import { cache } from 'react';
import { db } from '@/db';
import { settings, type Settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SINGLETON_ID = 1;

/** Read the singleton settings row, creating it with defaults on first run. */
export const getSettings = cache(async (): Promise<Settings> => {
  const existing = await db.select().from(settings).where(eq(settings.id, SINGLETON_ID)).get();

  if (existing) return existing;

  const created = await db.insert(settings).values({ id: SINGLETON_ID }).returning().get();

  return created;
});
