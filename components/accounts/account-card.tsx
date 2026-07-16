"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/shared/amount";
import { IconDisc } from "@/components/shared/badges";
import { Meter } from "@/components/charts/meter";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountDialog } from "./account-dialog";
import { useT } from "@/components/providers/settings-provider";
import { ACCOUNT_TYPE_META } from "@/lib/constants";
import { formatPercent } from "@/lib/money";
import { deleteAccount, setAccountArchived } from "@/lib/actions/accounts";
import type { AccountWithBalance } from "@/lib/data/accounts";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";

export function AccountCard({ account }: { account: AccountWithBalance }) {
  const t = useT();
  const meta = ACCOUNT_TYPE_META[account.type];
  const [editOpen, setEditOpen] = React.useState(false);
  const deleteTriggerRef = React.useRef<HTMLButtonElement>(null);

  const isCredit = account.type === "credit";
  const limit = account.creditLimit ?? 0;
  const showUtilization = isCredit && limit > 0;
  const utilization = showUtilization ? Math.max(0, -account.balance) / limit : 0;

  async function handleArchive() {
    const res = await setAccountArchived(account.id, !account.isArchived);
    if (res.ok) {
      toast.success(
        account.isArchived ? t("accounts.toastRestored") : t("accounts.toastArchived")
      );
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete() {
    const res = await deleteAccount(account.id);
    if (res.ok) toast.success(t("accounts.toastDeleted"));
    else toast.error(res.error);
  }

  return (
    <div
      className={cn(
        "lift relative flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card",
        account.isArchived && "opacity-70"
      )}
    >
      {/* Stretched link — the whole card navigates to filtered transactions. */}
      <Link
        href={`/transactions?accountId=${account.id}`}
        aria-label={t("accounts.viewTransactions", { name: account.name })}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <IconDisc icon={account.icon ?? meta.icon} color={account.color} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {account.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {account.institution || t(`accounts.type.${account.type}`)}
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground max-sm:size-9"
                  aria-label={t("accounts.actions")}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                {t("action.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleArchive()}>
                {account.isArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
                {account.isArchived ? t("accounts.restore") : t("accounts.archive")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => deleteTriggerRef.current?.click()}
              >
                <Trash2 className="size-4" />
                {t("action.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t(`accounts.type.${account.type}`)}
          </p>
          {!account.includeInNetWorth && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">
              {t("accounts.offNetWorth")}
            </span>
          )}
        </div>
        <Amount
          value={account.balance}
          decimals={false}
          className={cn(
            "font-display text-2xl font-medium leading-none tracking-tight",
            account.balance < 0 && "text-negative"
          )}
        />
      </div>

      {showUtilization && (
        <div className="space-y-1.5">
          <Meter value={utilization} tone="auto" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("accounts.used", { pct: formatPercent(utilization) })}</span>
            <span className="inline-flex items-center gap-1">
              {t("accounts.limit")}
              <Amount value={limit} decimals={false} className="tnum text-foreground" />
            </span>
          </div>
        </div>
      )}

      {/* Controlled edit dialog + hidden trigger for the delete confirm.
          Rendered outside the menu so they persist when it closes. */}
      <AccountDialog account={account} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        trigger={
          <button ref={deleteTriggerRef} type="button" className="sr-only" tabIndex={-1} aria-hidden />
        }
        title={t("accounts.deleteTitle")}
        description={t("accounts.deleteDesc", { name: account.name })}
        confirmLabel={t("accounts.deleteConfirm")}
        confirmPhrase={account.name}
        confirmPhraseLabel={t("accounts.deleteTypeName", { name: account.name })}
        onConfirm={handleDelete}
      />
    </div>
  );
}
