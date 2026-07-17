'use client';

import { IconDisc } from '@/components/shared/badges';
import { Amount } from '@/components/shared/amount';
import { useT } from '@/components/providers/settings-provider';
import { ACCOUNT_TYPE_META } from '@/lib/constants';
import type { AccountWithBalance } from '@/lib/data/accounts';

export function AccountsSummary({ accounts }: { accounts: AccountWithBalance[] }) {
  const t = useT();
  const assets = accounts.filter((a) => a.group === 'asset');
  const liabilities = accounts.filter((a) => a.group === 'liability');

  return (
    <div className="space-y-4">
      {assets.length > 0 && <Group title={t('common.assets')} accounts={assets} />}
      {liabilities.length > 0 && <Group title={t('common.liabilities')} accounts={liabilities} />}
    </div>
  );
}

function Group({ title, accounts }: { title: string; accounts: AccountWithBalance[] }) {
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <Amount value={total} decimals={false} className="text-xs font-medium" />
      </div>
      <ul className="space-y-0.5">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 py-1">
            <IconDisc icon={a.icon ?? ACCOUNT_TYPE_META[a.type].icon} color={a.color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{a.name}</p>
            </div>
            <Amount value={a.balance} decimals={false} className="text-sm font-medium tnum" />
          </li>
        ))}
      </ul>
    </div>
  );
}
