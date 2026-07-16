"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/components/providers/settings-provider";
import { Field, AmountInput } from "@/components/shared/form-fields";
import { IconDisc } from "@/components/shared/badges";
import { Icon } from "@/components/shared/icon";
import { upsertBudget } from "@/lib/actions/budgets";
import { fromCents } from "@/lib/money";
import { formatMonthLabel } from "@/lib/format";
import type { Category } from "@/db/schema";
import type { BudgetLine } from "@/lib/data/budgets";

/**
 * Reusable budget upsert dialog. Three modes:
 *  - `line` present  → edit an existing budget (category fixed).
 *  - `fixedCategoryId`→ set a budget for a known category (category fixed).
 *  - neither          → add a new budget, choosing from a Select.
 */
export function BudgetEditor({
  categories,
  period,
  line,
  fixedCategoryId,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  categories: Category[];
  period: string;
  line?: BudgetLine | null;
  fixedCategoryId?: string | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const fixedId = line?.categoryId ?? fixedCategoryId ?? null;
  const isFixed = fixedId != null;
  const isEdit = !!line;

  const [categoryId, setCategoryId] = React.useState(
    fixedId ?? categories[0]?.id ?? ""
  );
  const [amount, setAmount] = React.useState(
    line ? String(fromCents(line.amount)) : ""
  );
  const [rollover, setRollover] = React.useState(line?.rolloverEnabled ?? false);
  const [pending, setPending] = React.useState(false);

  // Re-seed the form each time the dialog opens so a shared instance always
  // reflects the latest target (edit line / preset category / fresh add) —
  // during render (tracking the previous open state) rather than in an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCategoryId(fixedId ?? categories[0]?.id ?? "");
      setAmount(line ? String(fromCents(line.amount)) : "");
      setRollover(line?.rolloverEnabled ?? false);
    }
  }

  const fixedCat = line
    ? { name: line.categoryName, color: line.categoryColor, icon: line.categoryIcon }
    : (() => {
        const c = categories.find((x) => x.id === fixedId);
        return c
          ? { name: c.name, color: c.color, icon: c.icon }
          : { name: t("budgets.selectedCategory"), color: null, icon: null };
      })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      toast.error(t("budgets.chooseCategory"));
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(t("budgets.enterAmount"));
      return;
    }

    setPending(true);
    const res = await upsertBudget({
      categoryId,
      period,
      amount: amt,
      rolloverEnabled: rollover,
    });
    setPending(false);

    if (res.ok) {
      toast.success(isEdit ? t("budgets.updatedToast") : t("budgets.setToast"));
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("budgets.editBudget") : t("budgets.setBudget")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("budgets.editDescription", { month: formatMonthLabel(period) })
              : t("budgets.setDescription", { month: formatMonthLabel(period) })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Field label={t("common.category")}>
            {isFixed ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <IconDisc icon={fixedCat.icon} color={fixedCat.color} size="sm" />
                <span className="truncate text-sm font-medium">{fixedCat.name}</span>
              </div>
            ) : (
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "")}
                items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder={t("budgets.chooseCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <Icon
                        name={c.icon}
                        className="size-3.5 shrink-0"
                        style={{ color: c.color ?? undefined }}
                      />
                      <span className="truncate">{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label={t("budgets.monthlyBudget")} htmlFor="budget-amount">
            <AmountInput
              id="budget-amount"
              value={amount}
              onChange={setAmount}
              autoFocus
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("budgets.rollover")}</p>
              <p className="text-xs text-muted-foreground">
                {t("budgets.rolloverDescription")}
              </p>
            </div>
            <Switch checked={rollover} onCheckedChange={setRollover} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending
                ? t("action.saving")
                : isEdit
                  ? t("action.saveChanges")
                  : t("budgets.setBudget")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
