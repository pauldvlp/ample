'use client';

import * as React from 'react';
import { useSettings } from '@/components/providers/settings-provider';

export interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  money?: boolean;
  hideLabel?: boolean;
  labelFormatter?: (label: string | number) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  money = true,
  hideLabel = false,
  labelFormatter,
}: ChartTooltipProps) {
  const { money: fmt } = useSettings();
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[9rem] rounded-lg border border-border/70 bg-popover/95 px-2.5 py-2 text-xs shadow-pop backdrop-blur-sm">
      {!hideLabel && label != null && (
        <p className="mb-1.5 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-[3px] w-3 rounded-full"
                style={{
                  background:
                    row.color ?? (row.payload?.fill as string) ?? 'var(--muted-foreground)',
                }}
              />
              {row.name}
            </span>
            <span className="tnum font-medium text-foreground">
              {money && typeof row.value === 'number' ? fmt(row.value) : row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
