"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/shared/amount";
import { Meter } from "@/components/charts/meter";
import { IconDisc } from "@/components/shared/badges";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoalDialog } from "./goal-dialog";
import { ContributeDialog } from "./contribute-dialog";
import { useT } from "@/components/providers/settings-provider";
import { setGoalStatus, deleteGoal } from "@/lib/actions/goals";
import { formatPercent } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { GoalWithProgress } from "@/lib/data/goals";
import type { AccountWithBalance } from "@/lib/data/accounts";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Plus,
  Calendar,
} from "lucide-react";

const STATUS_META: Record<
  GoalWithProgress["status"],
  { labelKey: string; className: string }
> = {
  active: { labelKey: "goals.statusActive", className: "bg-primary/10 text-primary" },
  paused: { labelKey: "goals.statusPaused", className: "bg-muted text-muted-foreground" },
  completed: {
    labelKey: "goals.statusCompleted",
    className: "bg-positive/12 text-positive",
  },
  archived: {
    labelKey: "goals.statusArchived",
    className: "bg-muted text-muted-foreground",
  },
};

export function GoalCard({
  goal,
  accounts,
}: {
  goal: GoalWithProgress;
  accounts: AccountWithBalance[];
}) {
  const t = useT();
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";
  const status = STATUS_META[goal.status];
  const linked = goal.accountId
    ? accounts.find((a) => a.id === goal.accountId)
    : undefined;

  function changeStatus(next: GoalWithProgress["status"], msg: string) {
    startTransition(async () => {
      const res = await setGoalStatus(goal.id, next);
      if (res.ok) toast.success(msg);
      else toast.error(res.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteGoal(goal.id);
      if (res.ok) toast.success(t("goals.toastDeleted"));
      else toast.error(res.error);
    });
  }

  return (
    <div
      className={cn(
        "lift flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-card",
        isCompleted && "hairline-brass"
      )}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconDisc icon={goal.icon ?? "Rocket"} color={goal.color} size="lg" />
          <div className="min-w-0 space-y-1">
            <h3 className="truncate font-display text-base font-medium leading-tight">
              {goal.name}
            </h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.08em]",
                status.className
              )}
            >
              {t(status.labelKey)}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("goals.goalOptions")}
                className="-mr-1 shrink-0 text-muted-foreground"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> {t("action.edit")}
            </DropdownMenuItem>
            {!isCompleted && (
              <DropdownMenuItem
                onClick={() =>
                  changeStatus("completed", t("goals.toastCompleted"))
                }
              >
                <CheckCircle2 className="size-4" /> {t("goals.markComplete")}
              </DropdownMenuItem>
            )}
            {goal.status === "active" && (
              <DropdownMenuItem
                onClick={() => changeStatus("paused", t("goals.toastPaused"))}
              >
                <Pause className="size-4" /> {t("goals.pause")}
              </DropdownMenuItem>
            )}
            {isPaused && (
              <DropdownMenuItem
                onClick={() => changeStatus("active", t("goals.toastResumed"))}
              >
                <Play className="size-4" /> {t("goals.resume")}
              </DropdownMenuItem>
            )}
            {isCompleted && (
              <DropdownMenuItem
                onClick={() => changeStatus("active", t("goals.toastReopened"))}
              >
                <RotateCcw className="size-4" /> {t("goals.reopen")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" /> {t("action.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* progress figures */}
      <div className="mt-5 flex items-end justify-between gap-2">
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-display text-2xl font-medium leading-none tracking-tight">
            <Amount value={goal.currentAmount} decimals={false} />
          </span>
          <span className="text-sm text-muted-foreground">
            {t("common.of")}{" "}
            <Amount value={goal.targetAmount} decimals={false} />
          </span>
        </p>
        <span className="tnum shrink-0 text-sm font-medium text-muted-foreground">
          {formatPercent(goal.pct)}
        </span>
      </div>

      <Meter
        value={goal.pct}
        tone="brand"
        color={goal.color ?? undefined}
        height={10}
        className="mt-2.5"
      />

      {/* remaining + target date */}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {goal.remaining > 0 ? (
            <>
              <Amount value={goal.remaining} decimals={false} />{" "}
              {t("goals.toGo")}
            </>
          ) : (
            t("goals.fullyFunded")
          )}
        </span>
        {goal.targetDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(goal.targetDate)}
          </span>
        )}
      </div>

      {/* projection */}
      {!isCompleted && goal.remaining > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {goal.projectedDate ? (
            <>
              {t("goals.onTrackFor")}{" "}
              <span className="font-medium text-foreground">
                {formatDate(goal.projectedDate)}
              </span>
              {goal.monthlyPace ? (
                <>
                  {" · ~"}
                  <Amount value={goal.monthlyPace} decimals={false} />
                  {t("goals.perMonth")}
                </>
              ) : null}
            </>
          ) : (
            t("goals.forecastHint")
          )}
        </p>
      )}

      {/* footer */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
        {goal.accountName ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Icon
              name={linked?.icon ?? "Wallet"}
              className="size-3.5 shrink-0"
              style={{ color: linked?.color ?? undefined }}
            />
            <span className="truncate">{goal.accountName}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/70">
            {t("goals.unlinked")}
          </span>
        )}
        <ContributeDialog
          goalId={goal.id}
          goalName={goal.name}
          remaining={goal.remaining}
          trigger={
            <Button size="sm" variant="outline" disabled={pending}>
              <Plus className="size-3.5" />
              {t("goals.contribute")}
            </Button>
          }
        />
      </div>

      {/* edit dialog — controlled, opened from the menu */}
      <GoalDialog
        goal={goal}
        accounts={accounts}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* delete confirmation — controlled, opened from the menu */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("goals.deleteTitle", { name: goal.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("goals.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("action.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {pending ? t("action.working") : t("goals.deleteGoal")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
