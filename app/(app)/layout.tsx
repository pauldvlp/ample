import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SimulationBanner } from "@/components/layout/simulation";
import { ProductTour } from "@/components/onboarding/product-tour";
import { getAccountsWithBalances, getNetWorthSummary } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getTags } from "@/lib/data/tags";
import { getPayeeOptions } from "@/lib/data/payees";
import { getSettings } from "@/lib/data/settings";
import { netWorthSeries } from "@/lib/data/reports";
import type { AccountOption, CategoryOption } from "@/lib/types";

// The whole app is backed by a live SQLite database; render every screen
// per-request so it always reflects the current data (mutations also revalidate).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accountsRaw, categoriesRaw, tags, nw, series, payees, settings] =
    await Promise.all([
      getAccountsWithBalances(),
      getCategories(),
      getTags(),
      getNetWorthSummary(),
      netWorthSeries(),
      getPayeeOptions(),
      getSettings(),
    ]);

  const accounts: AccountOption[] = accountsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    color: a.color,
    icon: a.icon,
    currency: a.currency,
  }));
  const categories: CategoryOption[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    icon: c.icon,
    parentId: c.parentId,
  }));

  const last = series.at(-1)?.netWorth ?? nw.netWorth;
  const prev = series.at(-2)?.netWorth ?? last;
  const deltaPct = prev !== 0 ? (last - prev) / Math.abs(prev) : 0;

  return (
    <div className="min-h-dvh">
      <DesktopSidebar netWorth={nw.netWorth} deltaPct={deltaPct} />
      <div className="lg:pl-60">
        <AppTopbar
          accounts={accounts}
          categories={categories}
          tags={tags}
          payees={payees}
        />
        <SimulationBanner />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <ProductTour
        autoStart={!settings.tourCompleted}
        aiEnabled={settings.aiEnabled}
      />
    </div>
  );
}
