'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { IconDisc } from '@/components/shared/badges';
import { Amount } from '@/components/shared/amount';
import { useSettings } from '@/components/providers/settings-provider';
import { formatDateSmart } from '@/lib/format';
import { ArrowLeftRight } from 'lucide-react';
import type { TransactionEnriched } from '@/lib/data/transactions';

export function TransactionRow({
  tx,
  onClick,
  showAccount = true,
  showDate = true,
  className,
  trailing,
  selected,
}: {
  tx: TransactionEnriched;
  onClick?: () => void;
  showAccount?: boolean;
  showDate?: boolean;
  className?: string;
  trailing?: React.ReactNode;
  selected?: boolean;
}) {
  const { t, foreign, currency: base } = useSettings();
  const isTransfer = tx.type === 'transfer';
  const hasOriginal =
    tx.originalAmount != null && !!tx.originalCurrency && tx.originalCurrency !== base;
  const title =
    tx.payee ||
    tx.category?.name ||
    (isTransfer ? t('common.transfer') : t('transactions.transaction'));
  const meta: string[] = [];
  if (isTransfer) {
    const acct = tx.transferAccountName ?? t('transactions.accountFallback');
    meta.push(
      tx.amount < 0
        ? t('transactions.toAccount', { name: acct })
        : t('transactions.fromAccount', { name: acct }),
    );
  } else {
    meta.push(tx.category?.name ?? t('common.uncategorized'));
  }
  if (showDate) meta.push(formatDateSmart(tx.date));
  if (showAccount && tx.account) meta.push(tx.account.name);

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
        onClick && 'hover:bg-muted/60',
        selected && 'bg-primary/8',
        className,
      )}
    >
      {isTransfer ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-brass/12 text-brass">
          <ArrowLeftRight className="size-4" />
        </span>
      ) : (
        <IconDisc
          icon={tx.category?.icon ?? tx.account?.icon}
          color={tx.category?.color ?? tx.account?.color}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta.join('  ·  ')}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <Amount
            value={tx.amount}
            colored={!isTransfer}
            showSign={!isTransfer}
            className="text-sm font-medium"
          />
          {hasOriginal && (
            <p className="sensitive tnum truncate text-[0.65rem] text-muted-foreground">
              {foreign(Math.abs(tx.originalAmount!), tx.originalCurrency!)}
            </p>
          )}
          {tx.tags.length > 0 && (
            <p className="truncate text-[0.65rem] text-muted-foreground">
              {tx.tags.map((t) => `#${t.name}`).join(' ')}
            </p>
          )}
        </div>
        {trailing}
      </div>
    </Comp>
  );
}
