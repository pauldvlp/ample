import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getDebts } from "@/lib/data/debts";
import { getAccountsWithBalances } from "@/lib/data/accounts";
import { getPayeeOptions } from "@/lib/data/payees";
import { DebtsView } from "@/components/debts/debts-view";
import { DebtDialog } from "@/components/debts/debt-dialog";
import { getT } from "@/lib/i18n/server";
import type { AccountOption } from "@/lib/types";
import { Plus } from "lucide-react";

export default async function DebtsPage() {
  const t = await getT();
  const [debts, accountsRaw, payees] = await Promise.all([
    getDebts(),
    getAccountsWithBalances(),
    getPayeeOptions(),
  ]);

  const accounts: AccountOption[] = accountsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    color: a.color,
    icon: a.icon,
    currency: a.currency,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("debts.eyebrow")}
        title={t("nav.debts")}
        description={t("debts.description")}
        actions={
          <DebtDialog
            accounts={accounts}
            payees={payees}
            trigger={
              <Button data-tour="debts-add">
                <Plus />
                {t("debts.add")}
              </Button>
            }
          />
        }
      />
      <DebtsView debts={debts} accounts={accounts} payees={payees} />
    </div>
  );
}
