'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSettings } from '@/components/providers/settings-provider';
import { ChartTooltip } from './chart-tooltip';
import type { NetWorthPoint } from '@/lib/data/reports';

export function NetWorthChart({
  data,
  height = 260,
  dataKey = 'netWorth',
}: {
  data: NetWorthPoint[];
  height?: number;
  dataKey?: 'netWorth' | 'assets' | 'liabilities';
}) {
  const { money } = useSettings();
  const lastIndex = data.length - 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.26} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          dy={8}
          minTickGap={16}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={46}
          tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          tickFormatter={(v: number) => money(v, { compact: true, cents: false })}
        />
        <Tooltip
          cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1, strokeDasharray: '3 3' }}
          content={<ChartTooltip />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="var(--chart-1)"
          strokeWidth={2.2}
          fill="url(#nw-fill)"
          isAnimationActive
          animationDuration={700}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
          dot={(props: { cx?: number; cy?: number; index?: number; key?: React.Key | null }) => {
            const { cx, cy, index } = props;
            const isLast = index === lastIndex;
            return (
              <circle
                key={`dot-${index}`}
                cx={cx}
                cy={cy}
                r={isLast ? 3.5 : 0}
                fill="var(--brass)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            );
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
