"use client";

import { cn } from "@/lib/utils";
import { IconDisc } from "@/components/shared/badges";
import { Amount } from "@/components/shared/amount";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/components/providers/settings-provider";
import { formatDate } from "@/lib/format";
import type { UpcomingBill } from "@/lib/data/recurring";

function dueLabel(
  days: number,
  t: ReturnType<typeof useT>,
): { text: string; tone: string } {
  if (days < 0)
    return { text: t("dashboard.overdue", { n: -days }), tone: "text-negative" };
  if (days === 0) return { text: t("dashboard.dueToday"), tone: "text-negative" };
  if (days === 1) return { text: t("dashboard.dueTomorrow"), tone: "text-brass" };
  if (days <= 7)
    return { text: t("dashboard.dueInDays", { n: days }), tone: "text-brass" };
  return {
    text: t("dashboard.dueInDays", { n: days }),
    tone: "text-muted-foreground",
  };
}

export function UpcomingBills({ bills }: { bills: UpcomingBill[] }) {
  const t = useT();
  if (!bills.length) {
    return (
      <EmptyState
        icon="CalendarDays"
        title={t("dashboard.noBills")}
        description={t("dashboard.noBillsDesc")}
      />
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {bills.slice(0, 6).map((b) => {
        const d = dueLabel(b.daysUntil, t);
        return (
          <li key={b.id} className="flex items-center gap-3 py-2.5 first:pt-0">
            <IconDisc icon={b.categoryIcon ?? "Repeat"} color={b.categoryColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{b.name}</p>
              <p className={cn("text-xs", d.tone)}>
                {d.text} · {formatDate(b.nextDueDate, "MMM d")}
              </p>
            </div>
            <Amount value={b.amount} abs className="text-sm font-medium" />
          </li>
        );
      })}
    </ul>
  );
}
