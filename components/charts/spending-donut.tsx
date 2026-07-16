"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useSettings } from "@/components/providers/settings-provider";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_SERIES } from "@/lib/constants";
import type { CategorySpend } from "@/lib/data/reports";

export function SpendingDonut({
  data,
  height = 220,
  centerLabel,
}: {
  data: CategorySpend[];
  height?: number;
  centerLabel?: string;
}) {
  const { money, t } = useSettings();
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius="66%"
            outerRadius="94%"
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={4}
            strokeWidth={0}
            animationDuration={650}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? CHART_SERIES[i % CHART_SERIES.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip hideLabel />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {centerLabel ?? t("common.spent")}
        </span>
        <span className="sensitive font-display text-xl font-medium tnum">
          {money(total, { compact: total > 1_000_000, cents: false })}
        </span>
      </div>
    </div>
  );
}
