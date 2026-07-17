import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { TransactionDialog } from '@/components/transactions/transaction-dialog';
import { TransactionsView } from '@/components/transactions/transactions-view';
import { listTransactions, type TransactionFilters } from '@/lib/data/transactions';
import { getAccountsWithBalances } from '@/lib/data/accounts';
import { getCategories } from '@/lib/data/categories';
import { getTags } from '@/lib/data/tags';
import { getPayeeOptions } from '@/lib/data/payees';
import type { AccountOption, CategoryOption, TagOption } from '@/lib/types';
import type { TransactionType } from '@/db/schema';
import { getT } from '@/lib/i18n/server';
import { Plus } from 'lucide-react';

const PAGE_SIZE = 50;
const TX_TYPES: readonly TransactionType[] = ['income', 'expense', 'transfer'];

function parseDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  // Parse the yyyy-MM-dd input value in local time so the range aligns with
  // how transaction dates are stored (local day boundaries).
  const d = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const t = await getT();

  const q = sp.q?.trim() || undefined;
  const accountId = sp.accountId || undefined;
  const categoryId = sp.categoryId || undefined;
  const type =
    sp.type && (TX_TYPES as readonly string[]).includes(sp.type)
      ? (sp.type as TransactionType)
      : undefined;
  const from = parseDate(sp.from, false);
  const to = parseDate(sp.to, true);
  const page = Math.max(1, Number(sp.page) || 1);

  const filters: TransactionFilters = {
    search: q,
    accountId,
    categoryId,
    type,
    from,
    to,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [result, accountsRaw, categoriesRaw, tagsRaw, payees] = await Promise.all([
    listTransactions(filters),
    getAccountsWithBalances(),
    getCategories(),
    getTags(),
    getPayeeOptions(),
  ]);

  const accounts: AccountOption[] = accountsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    color: a.color,
    icon: a.icon,
    currency: a.currency,
  }));
  const categories: CategoryOption[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    icon: c.icon,
    parentId: c.parentId,
  }));
  const tags: TagOption[] = tagsRaw.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('transactions.eyebrow')}
        title={t('nav.transactions')}
        description={t('transactions.description')}
        actions={
          <TransactionDialog
            accounts={accounts}
            categories={categories}
            tags={tags}
            payees={payees}
            trigger={
              <Button data-tour="transactions-add">
                <Plus />
                {t('transactions.new')}
              </Button>
            }
          />
        }
      />

      <TransactionsView
        items={result.items}
        total={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        filters={{
          q: sp.q ?? '',
          accountId: sp.accountId ?? '',
          categoryId: sp.categoryId ?? '',
          type: type ?? '',
          from: sp.from ?? '',
          to: sp.to ?? '',
        }}
        accounts={accounts}
        categories={categories}
        tags={tags}
        payees={payees}
      />
    </div>
  );
}
