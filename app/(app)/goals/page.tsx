import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Amount, AnimatedAmount } from '@/components/shared/amount';
import { Meter } from '@/components/charts/meter';
import { Button } from '@/components/ui/button';
import { getGoalsWithProgress } from '@/lib/data/goals';
import { getAccountsWithBalances } from '@/lib/data/accounts';
import { formatPercent } from '@/lib/money';
import { GoalCard } from '@/components/goals/goal-card';
import { GoalDialog } from '@/components/goals/goal-dialog';
import { getT } from '@/lib/i18n/server';
import { Plus } from 'lucide-react';

export default async function GoalsPage() {
  const t = await getT();
  const [goals, accounts] = await Promise.all([getGoalsWithProgress(), getAccountsWithBalances()]);

  const visible = goals.filter((g) => g.status !== 'archived');
  const active = visible.filter((g) => g.status === 'active' || g.status === 'paused');
  const completed = visible.filter((g) => g.status === 'completed');

  const totalSaved = visible.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = visible.reduce((s, g) => s + g.targetAmount, 0);
  const aggPct = totalTarget > 0 ? totalSaved / totalTarget : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('goals.eyebrow')}
        title={t('goals.title')}
        description={t('goals.description')}
        actions={
          <GoalDialog
            accounts={accounts}
            trigger={
              <Button data-tour="goals-add">
                <Plus className="size-4" />
                {t('goals.addGoal')}
              </Button>
            }
          />
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="PiggyBank"
          title={t('goals.emptyTitle')}
          description={t('goals.emptyDescription')}
          action={
            <GoalDialog
              accounts={accounts}
              trigger={
                <Button>
                  <Plus className="size-4" />
                  {t('goals.createGoal')}
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          {/* summary strip */}
          <section
            data-tour="goals-summary"
            className="hairline-brass rounded-2xl border border-border/70 bg-card p-5 shadow-card"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {t('goals.totalSaved')}
                </p>
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <AnimatedAmount
                    value={totalSaved}
                    decimals={false}
                    className="font-display text-3xl font-medium leading-none tracking-tight"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('common.of')} <Amount value={totalTarget} decimals={false} />{' '}
                    {t('goals.targetedSuffix')}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-6">
                <SummaryStat label={t('goals.progress')} value={formatPercent(aggPct)} />
                <SummaryStat label={t('goals.active')} value={String(active.length)} />
                <SummaryStat label={t('goals.completed')} value={String(completed.length)} />
              </div>
            </div>
            <Meter value={aggPct} tone="brand" color="var(--brass)" height={10} className="mt-4" />
          </section>

          {active.length > 0 && (
            <section className="space-y-3">
              {completed.length > 0 && (
                <h2 className="font-display text-base font-medium text-foreground">
                  {t('goals.inProgress')}
                </h2>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((g) => (
                  <GoalCard key={g.id} goal={g} accounts={accounts} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-base font-medium text-foreground">
                {t('goals.completed')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((g) => (
                  <GoalCard key={g.id} goal={g} accounts={accounts} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 text-right">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="tnum font-display text-lg font-medium leading-none text-foreground">{value}</p>
    </div>
  );
}
