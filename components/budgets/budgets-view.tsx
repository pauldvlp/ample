"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/settings-provider";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount, AnimatedAmount } from "@/components/shared/amount";
import { IconDisc } from "@/components/shared/badges";
import { Meter } from "@/components/charts/meter";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BudgetEditor } from "./budget-editor";
import {
  copyBudgetsFromPreviousMonth,
  deleteBudget,
} from "@/lib/actions/budgets";
import { formatPercent } from "@/lib/money";
import { formatMonthLabel, monthKey, monthKeyToDate } from "@/lib/format";
import type { BudgetSummary, BudgetLine } from "@/lib/data/budgets";
import type { Category } from "@/db/schema";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarClock,
  Repeat,
  Trash2,
} from "lucide-react";

const EYEBROW =
  "text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground";

type EditorTarget =
  | { mode: "add" }
  | { mode: "edit"; line: BudgetLine }
  | { mode: "preset"; categoryId: string };

export function BudgetsView({
  budget,
  categories,
  period,
}: {
  budget: BudgetSummary;
  categories: Category[];
  period: string;
}) {
  const t = useT();
  const router = useRouter();
  const [copying, startCopy] = React.useTransition();
  const [target, setTarget] = React.useState<EditorTarget | null>(null);

  const hasLines = budget.lines.length > 0;
  const overBudget = budget.remaining < 0;

  function copyLastMonth() {
    startCopy(async () => {
      const res = await copyBudgetsFromPreviousMonth(period);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const copied = res.data?.copied ?? 0;
      toast.success(
        copied > 0
          ? t("budgets.copied", { n: copied })
          : t("budgets.noneLastMonth")
      );
    });
  }

  const addButton = (
    <Button size="sm" onClick={() => setTarget({ mode: "add" })}>
      <Plus /> {t("budgets.add")}
    </Button>
  );
  const copyButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={copyLastMonth}
      disabled={copying}
    >
      <CalendarClock /> {copying ? t("budgets.copying") : t("budgets.copyLastMonth")}
    </Button>
  );

  return (
    <div className="space-y-5">
      {/* toolbar: month switcher + actions */}
      <div
        data-tour="budgets-toolbar"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <MonthSwitcher period={period} onChange={(p) => router.push(`/budgets?period=${p}`)} />
        <div className="flex flex-wrap items-center gap-2">
          {copyButton}
          {addButton}
        </div>
      </div>

      {/* summary hero */}
      {hasLines && (
        <SectionCard hairline noContentPadding>
          <div className="p-5 sm:p-6" data-tour="budgets-meter">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className={EYEBROW}>
                  {t("budgets.monthSpent", { month: formatMonthLabel(period) })}
                </p>
                <AnimatedAmount
                  value={budget.totalSpent}
                  decimals={false}
                  className="mt-1 block font-display text-4xl font-medium leading-none text-foreground sm:text-[2.75rem]"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("common.of")}{" "}
                  <Amount value={budget.totalBudget} decimals={false} />{" "}
                  {t("budgets.budgeted")}
                </p>
              </div>
              <div className="sm:text-right">
                <p className={EYEBROW}>
                  {overBudget ? t("budgets.overBudget") : t("common.remaining")}
                </p>
                <Amount
                  value={budget.remaining}
                  decimals={false}
                  colored
                  className="mt-1 block font-display text-2xl font-medium leading-none"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("budgets.pctOfBudgetUsed", { pct: formatPercent(budget.pct) })}
                </p>
              </div>
            </div>
            <Meter value={budget.pct} height={10} className="mt-6" />
          </div>
        </SectionCard>
      )}

      {/* category budget lines */}
      {hasLines ? (
        <SectionCard
          title={t("budgets.categoryBudgets")}
          description={t("budgets.categoriesCount", { n: budget.lines.length })}
          noContentPadding
          contentClassName="px-2 py-2"
        >
          <ul>
            {budget.lines.map((line) => (
              <BudgetRow
                key={line.categoryId}
                line={line}
                onEdit={() => setTarget({ mode: "edit", line })}
              />
            ))}
          </ul>
        </SectionCard>
      ) : (
        <EmptyState
          icon="PieChart"
          title={t("budgets.emptyTitle")}
          description={t("budgets.emptyDescription")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {copyButton}
              {addButton}
            </div>
          }
        />
      )}

      {/* unbudgeted spending */}
      {budget.unbudgeted.length > 0 && (
        <SectionCard
          title={t("budgets.unbudgetedTitle")}
          description={t("budgets.unbudgetedDescription")}
          noContentPadding
          contentClassName="px-2 py-2"
        >
          <ul>
            {budget.unbudgeted.map((u) => (
              <li
                key={u.categoryId}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <IconDisc icon={u.icon} color={u.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <Amount value={u.spent} decimals={false} /> {t("common.spent")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTarget({ mode: "preset", categoryId: u.categoryId })
                  }
                >
                  {t("budgets.setBudget")}
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* shared add / edit / preset editor */}
      <BudgetEditor
        categories={categories}
        period={period}
        line={target?.mode === "edit" ? target.line : null}
        fixedCategoryId={target?.mode === "preset" ? target.categoryId : null}
        open={target !== null}
        onOpenChange={(o) => {
          if (!o) setTarget(null);
        }}
      />
    </div>
  );
}

function MonthSwitcher({
  period,
  onChange,
}: {
  period: string;
  onChange: (period: string) => void;
}) {
  const t = useT();
  const shift = (delta: number) =>
    onChange(monthKey(addMonths(monthKeyToDate(period), delta)));

  return (
    <div className="inline-flex items-center gap-1 self-start rounded-full border border-border/70 bg-card p-1 shadow-card">
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full max-sm:size-9"
        onClick={() => shift(-1)}
        aria-label={t("budgets.prevMonth")}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-[9.5rem] text-center font-display text-sm font-medium text-foreground">
        {formatMonthLabel(period)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full max-sm:size-9"
        onClick={() => shift(1)}
        aria-label={t("budgets.nextMonth")}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

function BudgetRow({
  line,
  onEdit,
}: {
  line: BudgetLine;
  onEdit: () => void;
}) {
  const t = useT();
  const [removing, startRemove] = React.useTransition();
  const over = line.remaining < 0;

  function remove() {
    startRemove(async () => {
      const res = line.budgetId
        ? await deleteBudget(line.budgetId)
        : { ok: false as const, error: t("budgets.notFound") };
      if (res.ok) toast.success(t("budgets.removedToast"));
      else toast.error(res.error);
    });
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("budgets.editAria", { name: line.categoryName })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <IconDisc icon={line.categoryIcon} color={line.categoryColor} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium">
                {line.categoryName}
              </span>
              {line.rolloverEnabled && (
                <Repeat className="size-3 shrink-0 text-brass" aria-label={t("budgets.rollsOver")} />
              )}
            </span>
            <span className="shrink-0 text-sm text-muted-foreground tnum">
              <Amount value={line.spent} decimals={false} />
              <span className="px-0.5 text-muted-foreground/60">/</span>
              <Amount value={line.amount} decimals={false} />
            </span>
          </div>
          <Meter value={line.pct} tone="auto" className="mt-2" />
          <div className="mt-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span
              className={cn(
                "font-medium tnum",
                over ? "text-negative" : "text-positive"
              )}
            >
              <Amount value={line.remaining} decimals={false} abs />{" "}
              {over ? t("budgets.over") : t("common.left")}
            </span>
            <span className="text-muted-foreground">
              {formatPercent(line.pct)} {t("common.used")}
            </span>
          </div>
        </div>
      </button>
      <ConfirmDialog
        title={t("budgets.removeConfirmTitle", { name: line.categoryName })}
        description={t("budgets.removeConfirmDescription")}
        confirmLabel={t("budgets.remove")}
        onConfirm={remove}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={removing}
            aria-label={t("budgets.removeAria", { name: line.categoryName })}
            className="shrink-0 self-center text-muted-foreground opacity-100 transition-opacity hover:text-negative sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
          >
            <Trash2 />
          </Button>
        }
      />
    </li>
  );
}
