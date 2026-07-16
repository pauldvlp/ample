"use client";

import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/amount";
import { Icon } from "@/components/shared/icon";
import { useT } from "@/components/providers/settings-provider";
import { Meter } from "@/components/charts/meter";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { SpendingDonut } from "@/components/charts/spending-donut";
import { CategoryBarList } from "@/components/charts/category-bar-list";
import { formatPercent } from "@/lib/money";
import type {
  CashFlow,
  CategorySpend,
  MonthlyFlow,
  NetWorthPoint,
} from "@/lib/data/reports";

export function ReportsGrid({
  series,
  incomeExpense,
  categorySpend,
  flow,
}: {
  series: NetWorthPoint[];
  incomeExpense: MonthlyFlow[];
  categorySpend: CategorySpend[];
  flow: CashFlow;
}) {
  const t = useT();
  const savingsRate = flow.income > 0 ? (flow.income - flow.expense) / flow.income : 0;
  const hasFlowHistory = incomeExpense.some((m) => m.income !== 0 || m.expense !== 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="reports-kpis">
        <StatTile
          label={t("common.income")}
          value={flow.income}
          icon="TrendingUp"
          iconColor="var(--positive)"
          sub={t("common.moneyIn")}
        />
        <StatTile
          label={t("common.expenses")}
          value={flow.expense}
          icon="TrendingDown"
          iconColor="var(--negative)"
          sub={t("common.moneyOut")}
        />
        <StatTile
          label={t("common.netCashFlow")}
          value={flow.net}
          icon="CircleDollarSign"
          sub={t("reports.incomeMinusExpenses")}
        />
        <PercentTile
          label={t("common.savingsRate")}
          value={savingsRate}
          sub={t("reports.ofIncomeKept")}
        />
      </div>

      {/* analytics bento */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-tour="reports-charts">
        <SectionCard
          className="lg:col-span-2"
          title={t("reports.netWorthTrendTitle")}
          description={t("reports.netWorthTrendDesc")}
          hairline
        >
          {series.length > 1 ? (
            <NetWorthChart data={series} height={300} />
          ) : (
            <EmptyState
              icon="LineChart"
              title={t("reports.emptyHistoryTitle")}
              description={t("reports.emptyHistoryDesc")}
            />
          )}
        </SectionCard>

        <SectionCard
          title={t("reports.incomeVsExpensesTitle")}
          description={t("reports.incomeVsExpensesDesc")}
        >
          {hasFlowHistory ? (
            <IncomeExpenseChart data={incomeExpense} height={280} />
          ) : (
            <EmptyState
              icon="Coins"
              title={t("reports.emptyCompareTitle")}
              description={t("reports.emptyCompareDesc")}
            />
          )}
        </SectionCard>

        <SectionCard
          title={t("reports.cashFlowTitle")}
          description={t("reports.cashFlowDesc")}
        >
          <CashFlowSummary flow={flow} savingsRate={savingsRate} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title={t("reports.spendingByCategoryTitle")}
          description={t("reports.spendingByCategoryDesc")}
        >
          {categorySpend.length ? (
            <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
              <SpendingDonut data={categorySpend} height={240} />
              <CategoryBarList items={categorySpend} />
            </div>
          ) : (
            <EmptyState
              icon="Receipt"
              title={t("reports.emptySpendingTitle")}
              description={t("reports.emptySpendingDesc")}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/** A StatTile-styled card that shows a percentage instead of a money value. */
function PercentTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="lift flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <span
          className="grid size-7 place-items-center rounded-lg"
          style={{
            backgroundColor: "color-mix(in oklch, var(--brass) 14%, transparent)",
            color: "var(--brass)",
          }}
        >
          <Icon name="PiggyBank" className="size-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="font-display text-2xl font-medium leading-none tracking-tight tnum">
          {formatPercent(value)}
        </span>
      </div>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function CashFlowSummary({
  flow,
  savingsRate,
}: {
  flow: CashFlow;
  savingsRate: number;
}) {
  const t = useT();
  const outMax = Math.max(flow.income, flow.expense, 1);
  const rows = [
    {
      label: t("common.moneyIn"),
      value: flow.income,
      color: "var(--positive)",
      ratio: flow.income / outMax,
    },
    {
      label: t("common.moneyOut"),
      value: flow.expense,
      color: "var(--negative)",
      ratio: flow.expense / outMax,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <Amount value={r.value} className="font-medium" decimals={false} />
            </div>
            <Meter value={r.ratio} tone="brand" color={r.color} height={8} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t("reports.netSaved")}
          </p>
          <Amount
            value={flow.net}
            colored
            showSign
            decimals={false}
            className="font-display text-lg font-medium"
          />
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t("common.savingsRate")}
          </p>
          <p className="font-display text-lg font-medium tnum">
            {formatPercent(savingsRate)}
          </p>
        </div>
      </div>
    </div>
  );
}
