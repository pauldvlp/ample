import { listTransactions } from '@/lib/data/transactions';
import { toDateInputValue } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADER = [
  'Date',
  'Type',
  'Amount',
  'Currency',
  'Account',
  'Category',
  'Payee',
  'Notes',
  'Status',
  'Tags',
];

/** RFC-4180 field escaping: wrap in quotes and double inner quotes when the
 *  value contains a comma, quote, or newline. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET() {
  const { items } = await listTransactions({ limit: 100000 });

  const lines = [HEADER.join(',')];
  for (const tx of items) {
    const row = [
      toDateInputValue(tx.date),
      tx.type,
      (tx.amount / 100).toFixed(2),
      tx.currency,
      tx.account?.name ?? '',
      tx.category?.name ?? '',
      tx.payee ?? '',
      tx.notes ?? '',
      tx.status,
      tx.tags.map((t) => t.name).join(', '),
    ].map((cell) => csvField(String(cell)));
    lines.push(row.join(','));
  }

  // Leading BOM so spreadsheet apps read UTF-8 (e.g. accented payees) cleanly.
  const csv = '﻿' + lines.join('\r\n') + '\r\n';

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=ample-transactions.csv',
    },
  });
}
