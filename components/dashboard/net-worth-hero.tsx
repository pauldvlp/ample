"use client";

import { AnimatedAmount, Amount, DeltaChip } from "@/components/shared/amount";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { useT } from "@/components/providers/settings-provider";
import type { NetWorthPoint } from "@/lib/data/reports";

const eyebrow =
  "text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground";

export function NetWorthHero({
  netWorth,
  deltaAmount,
  deltaPct,
  assets,
  liabilities,
  series,
}: {
  netWorth: number;
  deltaAmount: number;
  deltaPct: number;
  assets: number;
  liabilities: number;
  series: NetWorthPoint[];
}) {
  const t = useT();
  return (
    <div className="hero-orb hairline-brass relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={eyebrow}>{t("common.netWorth")}</p>
          <AnimatedAmount
            value={netWorth}
            className="mt-1 block font-display text-4xl font-medium leading-none tracking-tight sm:text-5xl"
          />
          <div className="mt-2.5 flex items-center gap-2">
            <DeltaChip value={deltaPct} positiveIsGood />
            <span className="text-xs text-muted-foreground">
              <Amount value={deltaAmount} showSign decimals={false} sensitive={false} />{" "}
              {t("dashboard.thisMonthInline")}
            </span>
          </div>
        </div>
        <div className="flex gap-5">
          <div>
            <p className={eyebrow}>{t("common.assets")}</p>
            <Amount
              value={assets}
              compact
              decimals={false}
              className="mt-1 block font-display text-lg font-medium text-positive"
            />
          </div>
          <div>
            <p className={eyebrow}>{t("common.liabilities")}</p>
            <Amount
              value={liabilities}
              compact
              decimals={false}
              className="mt-1 block font-display text-lg font-medium text-negative"
            />
          </div>
        </div>
      </div>
      <div className="mt-4 -mx-2 flex-1">
        <NetWorthChart data={series} height={230} />
      </div>
    </div>
  );
}
