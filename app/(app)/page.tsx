import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { getDashboardData } from "@/lib/data/dashboard";
import { getSettings } from "@/lib/data/settings";
import { NetWorthHero } from "@/components/dashboard/net-worth-hero";
import { SpendingBreakdown } from "@/components/dashboard/spending-breakdown";
import { UpcomingBills } from "@/components/dashboard/upcoming-bills";
import { GoalsMini } from "@/components/dashboard/goals-mini";
import { BudgetMini } from "@/components/dashboard/budget-mini";
import { AccountsSummary } from "@/components/dashboard/accounts-summary";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { formatPercent } from "@/lib/money";
import { formatMonthLabel, currentMonthKey } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

function greeting(t: Awaited<ReturnType<typeof getT>>): string {
  const h = new Date().getHours();
  if (h < 12) return t("dashboard.greetingMorning");
  if (h < 18) return t("dashboard.greetingAfternoon");
  return t("dashboard.greetingEvening");
}

export default async function DashboardPage() {
  const [d, settings, t] = await Promise.all([
    getDashboardData(),
    getSettings(),
    getT(),
  ]);
  const name = settings.displayName && settings.displayName !== "Ample"
    ? `, ${settings.displayName}`
    : "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatMonthLabel(currentMonthKey())}
        title={`${greeting(t)}${name}`}
        description={t("dashboard.description")}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="dashboard-kpis">
        <StatTile
          label={t("dashboard.incomeThisMonth")}
          value={d.thisMonth.income}
          icon="TrendingUp"
          iconColor="var(--positive)"
          sub={t("common.moneyIn")}
        />
        <StatTile
          label={t("dashboard.spendingThisMonth")}
          value={d.thisMonth.expense}
          delta={d.spendingDeltaPct}
          positiveIsGood={false}
          icon="TrendingDown"
          iconColor="var(--negative)"
          sub={t("common.vsLastMonth")}
        />
        <StatTile
          label={t("common.netCashFlow")}
          value={d.thisMonth.net}
          icon="ArrowLeftRight"
          sub={t("dashboard.savingsRateSub", { pct: formatPercent(d.savingsRate) })}
        />
        <StatTile
          label={t("dashboard.leftToBudget")}
          value={d.budget.remaining}
          icon="PieChart"
          iconColor="var(--brass)"
          sub={t("dashboard.budgetUsedSub", { pct: formatPercent(d.budget.pct) })}
        />
      </div>

      {/* bento */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2" data-tour="dashboard-networth">
          <NetWorthHero
            netWorth={d.netWorth}
            deltaAmount={d.netWorthDelta.amount}
            deltaPct={d.netWorthDelta.pct}
            assets={d.assets}
            liabilities={d.liabilities}
            series={d.netWorthSeries}
          />
        </div>
        <SectionCard
          title={t("dashboard.spending")}
          description={t("dashboard.spendingDesc")}
          href="/reports"
        >
          <SpendingBreakdown data={d.spendingDonut} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title={t("dashboard.incomeVsExpenses")}
          description={t("dashboard.last6Months")}
          href="/reports"
        >
          <IncomeExpenseChart data={d.incomeVsExpense} height={250} />
        </SectionCard>
        <SectionCard title={t("dashboard.upcomingBills")} description={t("dashboard.next30Days")} href="/recurring">
          <UpcomingBills bills={d.upcomingBills} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title={t("dashboard.recentActivity")}
          href="/transactions"
        >
          {d.recent.length ? (
            <div className="-mx-2">
              {d.recent.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="Receipt"
              title={t("dashboard.noTransactions")}
              description={t("dashboard.noTransactionsDesc")}
            />
          )}
        </SectionCard>
        <SectionCard title={t("nav.goals")} href="/goals">
          <GoalsMini goals={d.goals} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title={t("dashboard.budgetProgress")}
          description={formatMonthLabel(d.budget.period)}
          href="/budgets"
        >
          <BudgetMini budget={d.budget} />
        </SectionCard>
        <SectionCard title={t("nav.accounts")} href="/accounts">
          <AccountsSummary accounts={d.accounts} />
        </SectionCard>
      </div>
    </div>
  );
}
