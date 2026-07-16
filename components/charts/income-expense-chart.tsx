"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSettings } from "@/components/providers/settings-provider";
import { ChartTooltip } from "./chart-tooltip";
import type { MonthlyFlow } from "@/lib/data/reports";

export function IncomeExpenseChart({
  data,
  height = 260,
}: {
  data: MonthlyFlow[];
  height?: number;
}) {
  const { money, t } = useSettings();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 6, left: 0, bottom: 0 }}
        barCategoryGap="28%"
        barGap={4}
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={46}
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          tickFormatter={(v: number) => money(v, { compact: true, cents: false })}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.45 }}
          content={<ChartTooltip />}
        />
        <Bar dataKey="income" name={t("common.income")} fill="var(--positive)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="expense" name={t("common.expenses")} fill="var(--negative)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
