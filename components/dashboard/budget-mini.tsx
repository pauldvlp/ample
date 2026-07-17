'use client';

import Link from 'next/link';
import { Amount } from '@/components/shared/amount';
import { Meter } from '@/components/charts/meter';
import { IconDisc } from '@/components/shared/badges';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { formatPercent } from '@/lib/money';
import { useT } from '@/components/providers/settings-provider';
import type { BudgetSummary } from '@/lib/data/budgets';

export function BudgetMini({ budget }: { budget: BudgetSummary }) {
  const t = useT();
  if (!budget.lines.length) {
    return (
      <EmptyState
        icon="PieChart"
        title={t('dashboard.noBudgets')}
        description={t('dashboard.noBudgetsDesc')}
        action={
          <Button size="sm" variant="outline" render={<Link href="/budgets" />}>
            {t('dashboard.setupBudgets')}
          </Button>
        }
      />
    );
  }
  const top = budget.lines.slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted/40 p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('dashboard.spentThisMonth')}</p>
            <Amount
              value={budget.totalSpent}
              decimals={false}
              className="font-display text-xl font-medium"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('common.of')} <Amount value={budget.totalBudget} decimals={false} /> ·{' '}
            {formatPercent(budget.pct)}
          </p>
        </div>
        <Meter value={budget.pct} className="mt-2" />
      </div>
      <ul className="space-y-3">
        {top.map((l) => (
          <li key={l.categoryId}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <IconDisc icon={l.categoryIcon} color={l.categoryColor} size="sm" />
                <span className="truncate">{l.categoryName}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                <Amount value={l.spent} decimals={false} /> /{' '}
                <Amount value={l.amount} decimals={false} />
              </span>
            </div>
            <Meter value={l.pct} height={6} />
          </li>
        ))}
      </ul>
    </div>
  );
}
