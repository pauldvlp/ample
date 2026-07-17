import { PageHeader } from '@/components/shared/page-header';
import { ReportsRange } from '@/components/reports/reports-range';
import { ReportsGrid } from '@/components/reports/reports-grid';
import { getT } from '@/lib/i18n/server';
import {
  cashFlow,
  incomeVsExpenseMonthly,
  monthRange,
  netWorthSeries,
  spendingByCategory,
} from '@/lib/data/reports';
import { startOfMonth, startOfYear, subMonths } from 'date-fns';

const RANGES = ['1m', '3m', '6m', '12m', 'ytd'] as const;
type Range = (typeof RANGES)[number];

function resolveRange(now: Date, range: Range): { from: Date; to: Date; months: number } {
  switch (range) {
    case '1m': {
      const { from, to } = monthRange(now);
      return { from, to, months: 1 };
    }
    case '3m':
      return { from: startOfMonth(subMonths(now, 2)), to: now, months: 3 };
    case '12m':
      return { from: startOfMonth(subMonths(now, 11)), to: now, months: 12 };
    case 'ytd':
      return { from: startOfYear(now), to: now, months: now.getMonth() + 1 };
    case '6m':
    default:
      return { from: startOfMonth(subMonths(now, 5)), to: now, months: 6 };
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = (await searchParams).range;
  const range: Range = (RANGES as readonly string[]).includes(raw ?? '') ? (raw as Range) : '6m';

  const now = new Date();
  const { from, to, months } = resolveRange(now, range);

  const t = await getT();

  const [series, incomeExpense, categorySpend, flow] = await Promise.all([
    netWorthSeries(),
    incomeVsExpenseMonthly(months),
    spendingByCategory(from, to),
    cashFlow(from, to),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('reports.eyebrow')}
        title={t('nav.reports')}
        description={t('reports.description')}
        actions={<ReportsRange current={range} />}
      />

      <ReportsGrid
        series={series}
        incomeExpense={incomeExpense}
        categorySpend={categorySpend}
        flow={flow}
      />
    </div>
  );
}
