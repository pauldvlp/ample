"use client";

import { cn } from "@/lib/utils";
import { IconDisc } from "@/components/shared/badges";
import { Amount } from "@/components/shared/amount";
import { formatPercent } from "@/lib/money";

export interface CategoryBarItem {
  name: string;
  color: string | null;
  icon: string | null;
  amount: number;
  pct: number;
}

export function CategoryBarList({
  items,
  showPct = true,
  className,
}: {
  items: CategoryBarItem[];
  showPct?: boolean;
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.amount), 1);
  return (
    <ul className={cn("space-y-0.5", className)}>
      {items.map((c, i) => {
        const width = Math.max(2, (c.amount / max) * 100);
        const color = c.color ?? "var(--chart-1)";
        return (
          <li
            key={`${c.name}-${i}`}
            className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
          >
            <IconDisc icon={c.icon} color={c.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {c.name}
                  {showPct && (
                    <span className="text-xs text-muted-foreground tnum">
                      {formatPercent(c.pct)}
                    </span>
                  )}
                </span>
                <Amount value={c.amount} className="shrink-0 text-sm" decimals={false} />
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${width}%`, backgroundColor: color }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
