import { PageHeader } from "@/components/shared/page-header";
import { BudgetsView } from "@/components/budgets/budgets-view";
import { getBudgetSummary } from "@/lib/data/budgets";
import { getCategoriesByKind } from "@/lib/data/categories";
import { currentMonthKey } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const t = await getT();
  const { period: periodParam } = await searchParams;
  const period = periodParam ?? currentMonthKey();

  const [budget, categories] = await Promise.all([
    getBudgetSummary(period),
    getCategoriesByKind("expense"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("budgets.eyebrow")}
        title={t("budgets.title")}
        description={t("budgets.description")}
      />
      <BudgetsView budget={budget} categories={categories} period={period} />
    </div>
  );
}
