import 'server-only';
import { db } from '@/db';
import { payees, transactions, type Payee } from '@/db/schema';
import { asc, isNotNull } from 'drizzle-orm';
import type { PayeeOption } from '@/lib/types';

/**
 * Payee suggestions for the creatable combobox: the saved `payees` table plus
 * any distinct free-text payees already used on transactions (so history is
 * suggestable even before a payee is formally saved). Deduped by name.
 */
export async function getPayeeOptions(): Promise<PayeeOption[]> {
  const saved: Payee[] = await db.select().from(payees).orderBy(asc(payees.name));

  const used = await db
    .selectDistinct({ name: transactions.payee })
    .from(transactions)
    .where(isNotNull(transactions.payee));

  const byName = new Map<string, PayeeOption>();
  for (const p of saved) {
    byName.set(p.name.toLowerCase(), {
      id: p.id,
      name: p.name,
      kind: p.kind,
      icon: p.icon,
      color: p.color,
    });
  }
  for (const u of used) {
    const name = (u.name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { id: null, name, kind: null, icon: null, color: null });
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
