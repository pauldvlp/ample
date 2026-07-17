import 'server-only';
import { addMonths } from 'date-fns';
import { getNow } from './clock';
import { getNetWorthSummary, type AccountWithBalance } from './accounts';
import {
  netWorthSeries,
  incomeVsExpenseMonthly,
  spendingByCategory,
  cashFlow,
  monthRange,
  type NetWorthPoint,
  type MonthlyFlow,
  type CategorySpend,
  type CashFlow,
} from './reports';
import { getBudgetSummary, type BudgetSummary } from './budgets';
import { getGoalsWithProgress, type GoalWithProgress } from './goals';
import { getUpcomingBills, type UpcomingBill } from './recurring';
import { getRecentTransactions } from './transactions';
import type { TransactionEnriched } from './transactions';

export interface CreditUtil {
  id: string;
  name: string;
  used: number;
  limit: number;
  pct: number;
}

export interface DashboardData {
  netWorth: number;
  assets: number;
  liabilities: number;
  netWorthSeries: NetWorthPoint[];
  netWorthDelta: { amount: number; pct: number };
  thisMonth: CashFlow;
  lastMonth: CashFlow;
  savingsRate: number;
  spendingDeltaPct: number;
  budget: BudgetSummary;
  topCategories: CategorySpend[];
  spendingDonut: CategorySpend[];
  upcomingBills: UpcomingBill[];
  goals: GoalWithProgress[];
  recent: TransactionEnriched[];
  incomeVsExpense: MonthlyFlow[];
  creditUtilization: CreditUtil[];
  accounts: AccountWithBalance[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = await getNow();
  const thisM = monthRange(now);
  const lastM = monthRange(addMonths(now, -1));

  const [
    nw,
    series,
    thisMonth,
    lastMonth,
    budget,
    goals,
    upcomingBills,
    recent,
    ive,
    donut,
    topCategories,
  ] = await Promise.all([
    getNetWorthSummary(),
    netWorthSeries(),
    cashFlow(thisM.from, thisM.to),
    cashFlow(lastM.from, lastM.to),
    getBudgetSummary(),
    getGoalsWithProgress(),
    getUpcomingBills(30),
    getRecentTransactions(7),
    incomeVsExpenseMonthly(6),
    spendingByCategory(thisM.from, thisM.to, 6),
    spendingByCategory(thisM.from, thisM.to, 5),
  ]);

  const last = series.at(-1)?.netWorth ?? nw.netWorth;
  const prev = series.at(-2)?.netWorth ?? last;
  const deltaAmount = last - prev;
  const netWorthDelta = {
    amount: deltaAmount,
    pct: prev !== 0 ? deltaAmount / Math.abs(prev) : 0,
  };

  const savingsRate =
    thisMonth.income > 0 ? (thisMonth.income - thisMonth.expense) / thisMonth.income : 0;
  const spendingDeltaPct =
    lastMonth.expense > 0 ? (thisMonth.expense - lastMonth.expense) / lastMonth.expense : 0;

  const creditUtilization: CreditUtil[] = nw.accounts
    .filter((a) => a.type === 'credit' && a.creditLimit && a.creditLimit > 0)
    .map((a) => {
      const used = Math.max(0, -a.balance);
      const limit = a.creditLimit!;
      return { id: a.id, name: a.name, used, limit, pct: used / limit };
    });

  return {
    netWorth: nw.netWorth,
    assets: nw.assets,
    liabilities: nw.liabilities,
    netWorthSeries: series,
    netWorthDelta,
    thisMonth,
    lastMonth,
    savingsRate,
    spendingDeltaPct,
    budget,
    topCategories,
    spendingDonut: donut,
    upcomingBills,
    goals,
    recent,
    incomeVsExpense: ive,
    creditUtilization,
    accounts: nw.accounts,
  };
}
