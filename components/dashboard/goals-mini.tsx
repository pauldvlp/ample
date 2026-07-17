'use client';

import Link from 'next/link';
import { IconDisc } from '@/components/shared/badges';
import { Amount } from '@/components/shared/amount';
import { Meter } from '@/components/charts/meter';
import { EmptyState } from '@/components/shared/empty-state';
import { formatPercent } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/providers/settings-provider';
import type { GoalWithProgress } from '@/lib/data/goals';

export function GoalsMini({ goals }: { goals: GoalWithProgress[] }) {
  const t = useT();
  const active = goals.filter((g) => g.status === 'active').slice(0, 4);
  if (!active.length) {
    return (
      <EmptyState
        icon="Target"
        title={t('dashboard.noGoals')}
        description={t('dashboard.noGoalsDesc')}
        action={
          <Button size="sm" variant="outline" render={<Link href="/goals" />}>
            {t('dashboard.createGoal')}
          </Button>
        }
      />
    );
  }
  return (
    <ul className="space-y-4">
      {active.map((g) => (
        <li key={g.id}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <IconDisc icon={g.icon ?? 'Target'} color={g.color} size="sm" />
              <span className="truncate text-sm font-medium">{g.name}</span>
            </span>
            <span className="tnum shrink-0 text-xs font-medium text-muted-foreground">
              {formatPercent(g.pct)}
            </span>
          </div>
          <Meter value={g.pct} tone="brand" color={g.color ?? undefined} />
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <Amount value={g.currentAmount} decimals={false} />
            <span>
              {t('common.of')} <Amount value={g.targetAmount} decimals={false} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
