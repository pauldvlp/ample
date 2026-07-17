'use client';

import { SpendingDonut } from '@/components/charts/spending-donut';
import { Amount } from '@/components/shared/amount';
import { ColorDot } from '@/components/shared/badges';
import { formatPercent } from '@/lib/money';
import { CHART_SERIES } from '@/lib/constants';
import { EmptyState } from '@/components/shared/empty-state';
import { useT } from '@/components/providers/settings-provider';
import type { CategorySpend } from '@/lib/data/reports';

export function SpendingBreakdown({ data }: { data: CategorySpend[] }) {
  const t = useT();
  if (!data.length) {
    return (
      <EmptyState
        icon="PieChart"
        title={t('dashboard.noSpending')}
        description={t('dashboard.noSpendingDesc')}
      />
    );
  }
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[190px_1fr]">
      <SpendingDonut data={data} height={190} />
      <ul className="space-y-1.5">
        {data.map((c, i) => (
          <li key={c.categoryId} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <ColorDot color={c.color ?? CHART_SERIES[i % CHART_SERIES.length]} />
              <span className="truncate">{c.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2.5">
              <span className="tnum text-xs text-muted-foreground">{formatPercent(c.pct)}</span>
              <Amount value={c.amount} decimals={false} className="text-sm" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
