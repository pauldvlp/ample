import 'server-only';
import { db } from '@/db';
import { tags, type Tag } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function getTags(): Promise<Tag[]> {
  return db.select().from(tags).orderBy(asc(tags.name));
}
