"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";
import { formatPercent } from "@/lib/money";
import { CountUp } from "./count-up";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface AmountProps {
  value: number; // cents
  /** color text green/red by sign */
  colored?: boolean;
  /** show an explicit + for positive */
  showSign?: boolean;
  /** absolute value (sign carried elsewhere) */
  abs?: boolean;
  compact?: boolean;
  /** show fraction digits (default true) */
  decimals?: boolean;
  /** monospace ledger figures */
  ledger?: boolean;
  /** obscure under privacy mode (default true) */
  sensitive?: boolean;
  className?: string;
}

export function Amount({
  value,
  colored = false,
  showSign = false,
  abs = false,
  compact = false,
  decimals = true,
  ledger = false,
  sensitive = true,
  className,
}: AmountProps) {
  const { money } = useSettings();
  const shown = abs ? Math.abs(value) : value;
  const text = money(shown, {
    compact,
    cents: decimals,
    signDisplay: showSign ? "exceptZero" : "auto",
  });
  const tone =
    colored && value !== 0
      ? value > 0
        ? "text-positive"
        : "text-negative"
      : undefined;
  return (
    <span
      className={cn(
        "tnum",
        ledger && "font-ledger",
        tone,
        sensitive && "sensitive",
        className
      )}
    >
      {text}
    </span>
  );
}

export function AnimatedAmount({
  value,
  compact = false,
  decimals = true,
  className,
  sensitive = true,
}: {
  value: number;
  compact?: boolean;
  decimals?: boolean;
  className?: string;
  sensitive?: boolean;
}) {
  const { money } = useSettings();
  return (
    <CountUp
      value={value}
      format={(n) => money(n, { compact, cents: decimals })}
      className={cn("tnum", sensitive && "sensitive", className)}
    />
  );
}

interface DeltaChipProps {
  /** ratio for percent, or cents for currency */
  value: number;
  kind?: "percent" | "currency";
  /** whether an increase is good (income up = good, spend up = bad) */
  positiveIsGood?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function DeltaChip({
  value,
  kind = "percent",
  positiveIsGood = true,
  className,
  showIcon = true,
}: DeltaChipProps) {
  const { money } = useSettings();
  const up = value > 0;
  const flat = value === 0;
  const good = flat ? null : up === positiveIsGood;
  const label =
    kind === "percent"
      ? formatPercent(value, { signDisplay: "exceptZero" })
      : money(value, { signDisplay: "exceptZero", compact: Math.abs(value) > 100000 });
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tnum",
        flat && "bg-muted text-muted-foreground",
        good === true && "bg-positive/12 text-positive",
        good === false && "bg-negative/12 text-negative",
        className
      )}
    >
      {showIcon && !flat && <Arrow className="size-3" />}
      {label}
    </span>
  );
}
