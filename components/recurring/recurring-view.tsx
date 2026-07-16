"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { IconDisc } from "@/components/shared/badges";
import { Amount } from "@/components/shared/amount";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecurringDialog } from "./recurring-dialog";
import { useT, useSettings } from "@/components/providers/settings-provider";
import type { TFunction } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import {
  postRecurringNow,
  toggleRecurringActive,
  deleteRecurring,
  revertLastRecurring,
} from "@/lib/actions/recurring";
import type { RecurringWithRefs, UpcomingBill } from "@/lib/data/recurring";
import type { AccountOption, CategoryOption, PayeeOption } from "@/lib/types";
import {
  MoreHorizontal,
  Plus,
  Send,
  Pencil,
  Trash2,
  Repeat,
  Undo2,
} from "lucide-react";

function dueLabel(days: number, t: TFunction): { text: string; tone: string } {
  if (days < 0)
    return { text: t("recurring.overdue", { n: -days }), tone: "text-negative" };
  if (days === 0) return { text: t("recurring.dueToday"), tone: "text-negative" };
  if (days === 1) return { text: t("recurring.dueTomorrow"), tone: "text-brass" };
  if (days <= 7)
    return { text: t("recurring.dueInDays", { n: days }), tone: "text-brass" };
  return {
    text: t("recurring.dueInDays", { n: days }),
    tone: "text-muted-foreground",
  };
}

function SubscriptionBadge() {
  const t = useT();
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brass/12 px-1.5 py-0.5 text-[0.62rem] font-medium tracking-wide text-brass">
      <Repeat className="size-2.5" />
      <span className="sr-only sm:not-sr-only">{t("recurring.subscription")}</span>
    </span>
  );
}

export function RecurringView({
  upcoming,
  rules,
  accounts,
  categories,
  payees,
}: {
  upcoming: UpcomingBill[];
  rules: RecurringWithRefs[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  payees?: PayeeOption[];
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SectionCard
        className="lg:col-span-1"
        title={t("recurring.upcoming")}
        description={t("recurring.next30Days")}
      >
        {upcoming.length ? (
          <ul className="divide-y divide-border/60">
            {upcoming.map((b) => (
              <UpcomingRow key={b.id} bill={b} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="Repeat"
            title={t("recurring.emptyUpcomingTitle")}
            description={t("recurring.emptyUpcomingDesc")}
          />
        )}
      </SectionCard>

      <SectionCard
        className="lg:col-span-2"
        title={t("recurring.allRecurring")}
        description={t("recurring.rulesCount", { n: rules.length })}
      >
        {rules.length ? (
          <div className="-mx-2">
            {rules.map((r) => (
              <RuleRow
                key={r.id}
                rule={r}
                accounts={accounts}
                categories={categories}
                payees={payees}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="Repeat"
            title={t("recurring.emptyRulesTitle")}
            description={t("recurring.emptyRulesDesc")}
            action={
              <RecurringDialog
                accounts={accounts}
                categories={categories}
                payees={payees}
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" />
                    {t("recurring.add")}
                  </Button>
                }
              />
            }
          />
        )}
      </SectionCard>
    </div>
  );
}

function UpcomingRow({ bill }: { bill: UpcomingBill }) {
  const { t, foreign, currency: base } = useSettings();
  const [pending, setPending] = React.useState(false);
  const d = dueLabel(bill.daysUntil, t);
  const hasOriginal =
    bill.originalAmount != null &&
    !!bill.originalCurrency &&
    bill.originalCurrency !== base;

  async function post() {
    setPending(true);
    const res = await postRecurringNow(bill.id);
    setPending(false);
    if (res.ok) toast.success(t("recurring.postedToast", { name: bill.name }));
    else toast.error(res.error);
  }

  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0">
      <IconDisc
        icon={bill.categoryIcon ?? "Repeat"}
        color={bill.categoryColor}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{bill.name}</p>
        <p className={cn("truncate text-xs", d.tone)}>
          {d.text} · {formatDate(bill.nextDueDate, "MMM d")}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Amount value={bill.amount} abs className="text-sm font-medium" />
        {hasOriginal && (
          <p className="sensitive tnum text-[0.6rem] text-muted-foreground">
            {foreign(Math.abs(bill.originalAmount!), bill.originalCurrency!)}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="xs"
        onClick={post}
        disabled={pending}
        aria-label={t("recurring.postAria", { name: bill.name })}
        className="shrink-0 gap-1 max-sm:size-9 max-sm:p-0"
      >
        <Send className="size-3.5" />
        <span className="hidden sm:inline">
          {pending ? t("recurring.posting") : t("recurring.postNow")}
        </span>
      </Button>
    </li>
  );
}

function RuleRow({
  rule,
  accounts,
  categories,
  payees,
}: {
  rule: RecurringWithRefs;
  accounts: AccountOption[];
  categories: CategoryOption[];
  payees?: PayeeOption[];
}) {
  const { t, foreign, currency: base } = useSettings();
  const [active, setActive] = React.useState(rule.isActive);
  const [busy, setBusy] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const deleteRef = React.useRef<HTMLButtonElement>(null);
  const revertRef = React.useRef<HTMLButtonElement>(null);
  const hasOriginal =
    rule.originalAmount != null &&
    !!rule.originalCurrency &&
    rule.originalCurrency !== base;

  // Keep the optimistic toggle in sync with the server-confirmed value —
  // during render (tracking the previous value) rather than in an effect.
  const [prevIsActive, setPrevIsActive] = React.useState(rule.isActive);
  if (rule.isActive !== prevIsActive) {
    setPrevIsActive(rule.isActive);
    setActive(rule.isActive);
  }

  const signedMonthly =
    rule.type === "income" ? rule.monthlyEquivalent : -rule.monthlyEquivalent;

  async function toggle(next: boolean) {
    setActive(next);
    const res = await toggleRecurringActive(rule.id, next);
    if (!res.ok) {
      setActive(!next);
      toast.error(res.error);
    }
  }

  async function post() {
    setBusy(true);
    const res = await postRecurringNow(rule.id);
    setBusy(false);
    if (res.ok) toast.success(t("recurring.postedToast", { name: rule.name }));
    else toast.error(res.error);
  }

  async function remove() {
    const res = await deleteRecurring(rule.id);
    if (res.ok) toast.success(t("recurring.deletedToast"));
    else toast.error(res.error);
  }

  async function revertLast() {
    const res = await revertLastRecurring(rule.id);
    if (res.ok) toast.success(t("recurring.revertedToast"));
    else
      toast.error(
        res.error === "nothing-to-revert"
          ? t("recurring.nothingToRevert")
          : res.error
      );
  }

  const meta = [
    rule.payee && rule.payee !== rule.name ? rule.payee : null,
    t(`recurring.freq.${rule.frequency}`),
    t("recurring.next", { date: formatDate(rule.nextDueDate) }),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60",
        !active && "opacity-55"
      )}
    >
      {/* Clicking the row opens the edit dialog, like a transaction row. */}
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label={t("recurring.editAria", { name: rule.name })}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
      >
        <IconDisc
          icon={rule.categoryIcon ?? "Repeat"}
          color={rule.categoryColor}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {rule.name}
            </p>
            {rule.isSubscription && <SubscriptionBadge />}
          </div>
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>

        <div className="shrink-0 text-right">
          <Amount
            value={signedMonthly}
            colored
            showSign
            className="text-sm font-medium"
          />
          <p className="text-[0.65rem] text-muted-foreground">
            {hasOriginal ? (
              <span className="sensitive tnum">
                {foreign(Math.abs(rule.originalAmount!), rule.originalCurrency!)}
              </span>
            ) : (
              t("recurring.perMonth")
            )}
          </p>
        </div>
      </button>

      <Switch
        checked={active}
        onCheckedChange={toggle}
        aria-label={active ? t("recurring.deactivate") : t("recurring.activate")}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("recurring.moreActions")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={post} disabled={busy}>
            <Send className="size-4" />
            {t("recurring.postNow")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {t("action.edit")}
          </DropdownMenuItem>
          {rule.postedCount > 0 && (
            <DropdownMenuItem onClick={() => revertRef.current?.click()}>
              <Undo2 className="size-4" />
              {t("recurring.revertLast")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => deleteRef.current?.click()}
          >
            <Trash2 className="size-4" />
            {t("action.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Controlled edit dialog + hidden confirm triggers, kept outside the menu
          so closing the menu doesn't unmount them. */}
      <RecurringDialog
        accounts={accounts}
        categories={categories}
        payees={payees}
        rule={rule}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        trigger={<button ref={deleteRef} type="button" className="hidden" tabIndex={-1} />}
        title={t("recurring.deleteTitle")}
        description={t("recurring.deleteDesc", { name: rule.name })}
        confirmLabel={t("action.delete")}
        onConfirm={remove}
      />
      <ConfirmDialog
        trigger={<button ref={revertRef} type="button" className="hidden" tabIndex={-1} />}
        title={t("recurring.revertLastTitle")}
        description={t("recurring.revertLastDesc", { name: rule.name })}
        confirmLabel={t("recurring.revert")}
        onConfirm={revertLast}
      />
    </div>
  );
}
