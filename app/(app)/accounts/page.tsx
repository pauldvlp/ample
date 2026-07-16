import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/amount";
import { Button } from "@/components/ui/button";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { getNetWorthSummary } from "@/lib/data/accounts";
import type { AccountWithBalance } from "@/lib/data/accounts";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n";

export default async function AccountsPage() {
  const t = await getT();
  const summary = await getNetWorthSummary();
  const accounts = summary.accounts;

  const assets = accounts.filter((a) => a.group === "asset");
  const liabilities = accounts.filter((a) => a.group === "liability");

  const addTrigger = (
    <Button data-tour="accounts-add">
      <Plus className="size-4" />
      {t("accounts.add")}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("accounts.eyebrow")}
        title={t("nav.accounts")}
        description={t("accounts.description")}
        actions={<AccountDialog trigger={addTrigger} />}
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon="Wallet"
          title={t("accounts.emptyTitle")}
          description={t("accounts.emptyDesc")}
          action={
            <AccountDialog
              trigger={
                <Button>
                  <Plus className="size-4" />
                  {t("accounts.add")}
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-tour="accounts-networth">
            <StatTile
              label={t("common.netWorth")}
              value={summary.netWorth}
              icon="Landmark"
              iconColor="var(--brass)"
              sub={t("accounts.netWorthSub")}
            />
            <StatTile
              label={t("common.assets")}
              value={summary.assets}
              icon="TrendingUp"
              iconColor="var(--positive)"
              sub={t("accounts.assetsSub")}
            />
            <StatTile
              label={t("common.liabilities")}
              value={summary.liabilities}
              icon="CreditCard"
              iconColor="var(--negative)"
              sub={t("accounts.liabilitiesSub")}
            />
          </div>

          <AccountGroup title={t("common.assets")} accounts={assets} t={t} />
          <AccountGroup title={t("common.liabilities")} accounts={liabilities} t={t} />
        </>
      )}
    </div>
  );
}

function AccountGroup({
  title,
  accounts,
  t,
}: {
  title: string;
  accounts: AccountWithBalance[];
  t: TFunction;
}) {
  if (accounts.length === 0) return null;
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 border-b border-border/70 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t(accounts.length === 1 ? "accounts.countOne" : "accounts.countMany", {
              n: accounts.length,
            })}
          </span>
        </div>
        <Amount
          value={total}
          decimals={false}
          className="font-display text-base font-medium tracking-tight text-foreground"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
      </div>
    </section>
  );
}
