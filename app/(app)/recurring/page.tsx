import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { Amount } from "@/components/shared/amount";
import { Button } from "@/components/ui/button";
import {
  getRecurringTotals,
  getSubscriptions,
  getUpcomingBills,
  getRecurringRules,
} from "@/lib/data/recurring";
import { getAccountsWithBalances } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getPayeeOptions } from "@/lib/data/payees";
import { RecurringView } from "@/components/recurring/recurring-view";
import { RecurringDialog } from "@/components/recurring/recurring-dialog";
import type { AccountOption, CategoryOption } from "@/lib/types";
import { getT } from "@/lib/i18n/server";
import { Plus, Repeat } from "lucide-react";

export default async function RecurringPage() {
  const t = await getT();
  const [totals, subscriptions, upcoming, rules, accounts, categories, payees] =
    await Promise.all([
      getRecurringTotals(),
      getSubscriptions(),
      getUpcomingBills(30),
      getRecurringRules(),
      getAccountsWithBalances(),
      getCategories(),
      getPayeeOptions(),
    ]);

  const accountOptions: AccountOption[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    color: a.color,
    icon: a.icon,
    currency: a.currency,
  }));
  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    icon: c.icon,
    parentId: c.parentId,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("recurring.eyebrow")}
        title={t("recurring.title")}
        description={t("recurring.description")}
        actions={
          <RecurringDialog
            accounts={accountOptions}
            categories={categoryOptions}
            payees={payees}
            trigger={
              <Button size="sm" data-tour="recurring-add">
                <Plus className="size-4" />
                {t("recurring.add")}
              </Button>
            }
          />
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-tour="recurring-kpis">
        <StatTile
          label={t("recurring.monthlyOut")}
          value={totals.monthlyOut}
          icon="TrendingDown"
          iconColor="var(--negative)"
          sub={t("recurring.monthlyOutSub")}
        />
        <StatTile
          label={t("recurring.subsPerMonth")}
          value={subscriptions.monthlyTotal}
          icon="Repeat"
          iconColor="var(--brass)"
          sub={
            <span>
              <Amount value={subscriptions.annualTotal} compact decimals={false} />
              {" "}
              {t("recurring.perYear")}
            </span>
          }
        />
        <div className="lift flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("recurring.activeRecurring")}
            </p>
            <span
              className="grid size-7 place-items-center rounded-lg"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
            >
              <Repeat className="size-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="font-display text-2xl font-medium leading-none tracking-tight tnum">
              {totals.count}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("recurring.subsCount", { n: subscriptions.items.length })}
          </p>
        </div>
      </div>

      <RecurringView
        upcoming={upcoming}
        rules={rules}
        accounts={accountOptions}
        categories={categoryOptions}
        payees={payees}
      />
    </div>
  );
}
