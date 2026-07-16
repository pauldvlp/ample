"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Field,
  AmountInput,
  ColorPicker,
  IconPicker,
} from "@/components/shared/form-fields";
import { IconSelect } from "@/components/shared/icon-select";
import { DatePicker } from "@/components/shared/date-picker";
import { useT } from "@/components/providers/settings-provider";
import { createGoal, updateGoal, type GoalInput } from "@/lib/actions/goals";
import { toDateInputValue, fromDateInputValue } from "@/lib/format";
import { fromCents } from "@/lib/money";
import { CATEGORY_PALETTE } from "@/lib/constants";
import type { GoalWithProgress } from "@/lib/data/goals";
import type { AccountWithBalance } from "@/lib/data/accounts";

/** Sentinel Select value for "no linked account" (Base UI Select forbids empty values). */
const NO_ACCOUNT = "__none__";

export function GoalForm({
  goal,
  accounts,
  onDone,
}: {
  goal?: GoalWithProgress | null;
  accounts: AccountWithBalance[];
  onDone?: () => void;
}) {
  const t = useT();
  const isEdit = !!goal;
  const [name, setName] = React.useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = React.useState(
    goal ? String(fromCents(goal.targetAmount)) : ""
  );
  const [currentAmount, setCurrentAmount] = React.useState(
    goal ? String(fromCents(goal.currentAmount)) : ""
  );
  const [targetDate, setTargetDate] = React.useState(
    goal?.targetDate ? toDateInputValue(goal.targetDate) : ""
  );
  const [accountId, setAccountId] = React.useState<string>(
    goal?.accountId ?? NO_ACCOUNT
  );
  const [icon, setIcon] = React.useState<string>(goal?.icon ?? "Rocket");
  const [color, setColor] = React.useState<string>(
    goal?.color ?? CATEGORY_PALETTE[0]
  );
  const [notes, setNotes] = React.useState(goal?.notes ?? "");
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("goals.errorName"));
      return;
    }
    const target = Number(targetAmount);
    if (!target || target <= 0) {
      toast.error(t("goals.errorTarget"));
      return;
    }

    const input: GoalInput = {
      name: name.trim(),
      targetAmount: target,
      currentAmount: Number(currentAmount) || 0,
      targetDate: targetDate ? fromDateInputValue(targetDate).getTime() : null,
      accountId: accountId === NO_ACCOUNT ? null : accountId,
      icon,
      color,
      notes: notes.trim() || null,
    };

    setPending(true);
    const res = isEdit
      ? await updateGoal(goal!.id, input)
      : await createGoal(input);
    setPending(false);

    if (res.ok) {
      toast.success(isEdit ? t("goals.toastUpdated") : t("goals.toastCreated"));
      onDone?.();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t("goals.name")} htmlFor="goal-name">
        <Input
          id="goal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("goals.namePlaceholder")}
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("goals.targetAmount")} htmlFor="goal-target">
          <AmountInput
            id="goal-target"
            value={targetAmount}
            onChange={setTargetAmount}
          />
        </Field>
        <Field label={t("goals.alreadySaved")} htmlFor="goal-current">
          <AmountInput
            id="goal-current"
            value={currentAmount}
            onChange={setCurrentAmount}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("goals.targetDate")}
          htmlFor="goal-date"
          hint={t("common.optional")}
        >
          <DatePicker
            id="goal-date"
            value={targetDate}
            onChange={setTargetDate}
            clearable
            placeholder={t("common.optional")}
          />
        </Field>
        <Field label={t("goals.linkedAccount")} hint={t("goals.linkedHint")}>
          <IconSelect
            options={accounts.map((a) => ({
              value: a.id,
              label: a.name,
              icon: a.icon,
              color: a.color,
            }))}
            value={accountId}
            onChange={(v) => setAccountId(v || NO_ACCOUNT)}
            none={{ value: NO_ACCOUNT, label: t("goals.noLinkedAccount") }}
            fallbackIcon="Wallet"
          />
        </Field>
      </div>

      <Field label={t("goals.appearance")}>
        <div className="flex items-center gap-3">
          <IconPicker value={icon} color={color} onChange={setIcon} />
          <ColorPicker value={color} onChange={setColor} />
        </div>
      </Field>

      <Field label={t("common.notes")} htmlFor="goal-notes">
        <Textarea
          id="goal-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("goals.notesPlaceholder")}
          rows={2}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending
            ? t("action.saving")
            : isEdit
              ? t("action.saveChanges")
              : t("goals.submitCreate")}
        </Button>
      </div>
    </form>
  );
}
