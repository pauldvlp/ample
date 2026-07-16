"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { TransactionRow } from "./transaction-row";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionFilters, type FilterState } from "./transaction-filters";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/amount";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/settings-provider";
import { deleteTransaction } from "@/lib/actions/transactions";
import { dateGroupLabel, toDateInputValue } from "@/lib/format";
import type {
  AccountOption,
  CategoryOption,
  TagOption,
  PayeeOption,
} from "@/lib/types";
import type { TransactionEnriched } from "@/lib/data/transactions";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface DayGroup {
  key: string;
  label: string;
  net: number;
  items: TransactionEnriched[];
}

function groupByDay(items: TransactionEnriched[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const tx of items) {
    const key = toDateInputValue(tx.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(tx);
      last.net += tx.amount;
    } else {
      groups.push({
        key,
        label: dateGroupLabel(tx.date),
        net: tx.amount,
        items: [tx],
      });
    }
  }
  return groups;
}

export function TransactionsView({
  items,
  total,
  page,
  pageSize,
  filters,
  accounts,
  categories,
  tags,
  payees,
}: {
  items: TransactionEnriched[];
  total: number;
  page: number;
  pageSize: number;
  filters: FilterState;
  accounts: AccountOption[];
  categories: CategoryOption[];
  tags: TagOption[];
  payees?: PayeeOption[];
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editing, setEditing] = React.useState<TransactionEnriched | null>(null);

  const groups = React.useMemo(() => groupByDay(items), [items]);

  const { inflow, outflow } = React.useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const tx of items) {
      if (tx.type === "transfer") continue;
      if (tx.amount > 0) inflow += tx.amount;
      else outflow += tx.amount;
    }
    return { inflow, outflow };
  }, [items]);

  const hasFilters = !!(
    filters.q ||
    filters.accountId ||
    filters.categoryId ||
    filters.type ||
    filters.from ||
    filters.to
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilters() {
    router.push(pathname);
  }

  async function handleDelete(id: string) {
    const res = await deleteTransaction(id);
    if (res.ok) toast.success(t("transactions.toastDeleted"));
    else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <TransactionFilters
        filters={filters}
        accounts={accounts}
        categories={categories}
      />

      {/* Results summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? t("transactions.none")
            : total === 1
              ? t("transactions.countOne", { n: total.toLocaleString() })
              : t("transactions.countMany", { n: total.toLocaleString() })}
        </p>
        {items.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("transactions.in")}</span>
              <Amount value={inflow} className="font-medium text-positive" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("transactions.out")}</span>
              <Amount value={outflow} className="font-medium text-negative" />
            </span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="Receipt"
          title={hasFilters ? t("transactions.emptyFilteredTitle") : t("transactions.emptyTitle")}
          description={
            hasFilters
              ? t("transactions.emptyFilteredDesc")
              : t("transactions.emptyDesc")
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                {t("transactions.clearFilters")}
              </Button>
            ) : (
              <TransactionDialog
                accounts={accounts}
                categories={categories}
                tags={tags}
                payees={payees}
                trigger={<Button>{t("transactions.new")}</Button>}
              />
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          {groups.map((group) => (
            <section key={group.key}>
              <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-card/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <span className="text-[0.68rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {group.label}
                </span>
                <Amount
                  value={group.net}
                  colored
                  showSign
                  className="text-xs font-medium"
                />
              </header>
              <div className="space-y-0.5 p-1.5">
                {group.items.map((tx) => (
                  <div key={tx.id} className="group flex items-center gap-0.5">
                    <TransactionRow
                      tx={tx}
                      onClick={() => setEditing(tx)}
                      className="min-w-0 flex-1"
                    />
                    <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("transactions.editAria")}
                        onClick={() => setEditing(tx)}
                        className="max-sm:hidden"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmDialog
                        title={t("transactions.deleteTitle")}
                        description={t("transactions.deleteDesc")}
                        confirmLabel={t("action.delete")}
                        onConfirm={() => handleDelete(tx.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("transactions.deleteAria")}
                            className="max-sm:size-9"
                          >
                            <Trash2 className="size-3.5 text-negative" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
          <p className="text-xs text-muted-foreground tnum">
            {t("transactions.showing", {
              a: rangeStart,
              b: rangeEnd,
              total: total.toLocaleString(),
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
              {t("transactions.prev")}
            </Button>
            <span className="px-1 text-xs text-muted-foreground tnum">
              {t("transactions.pageOf", { p: page, n: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!canNext}
              onClick={() => goToPage(page + 1)}
            >
              {t("transactions.next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Controlled edit dialog — keyed per transaction so the form reinitializes */}
      {editing && (
        <TransactionDialog
          key={editing.id}
          accounts={accounts}
          categories={categories}
          tags={tags}
          payees={payees}
          transaction={editing}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      )}
    </div>
  );
}
