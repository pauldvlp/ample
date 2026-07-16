"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AnimatedAmount, DeltaChip } from "./amount";
import { Icon } from "./icon";

export function StatTile({
  label,
  value,
  compact = false,
  decimals = false,
  delta,
  deltaKind = "percent",
  positiveIsGood = true,
  icon,
  iconColor,
  sub,
  valueClassName,
  className,
  children,
}: {
  label: string;
  value: number; // cents
  compact?: boolean;
  decimals?: boolean;
  delta?: number;
  deltaKind?: "percent" | "currency";
  positiveIsGood?: boolean;
  icon?: string;
  iconColor?: string;
  sub?: React.ReactNode;
  valueClassName?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "lift flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 shadow-card",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span
            className="grid size-7 place-items-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in oklch, ${iconColor ?? "var(--primary)"} 14%, transparent)`,
              color: iconColor ?? "var(--primary)",
            }}
          >
            <Icon name={icon} className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-3 flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <AnimatedAmount
          value={value}
          compact={compact}
          decimals={decimals}
          className={cn(
            "block w-full min-w-0 truncate font-display text-xl font-medium leading-none tracking-tight sm:w-auto sm:text-2xl",
            valueClassName
          )}
        />
        {delta !== undefined && (
          <DeltaChip
            value={delta}
            kind={deltaKind}
            positiveIsGood={positiveIsGood}
            className="shrink-0"
          />
        )}
      </div>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
      {children}
    </div>
  );
}
