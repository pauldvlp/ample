"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconSelect } from "@/components/shared/icon-select";
import { DatePicker } from "@/components/shared/date-picker";
import { useT } from "@/components/providers/settings-provider";
import type { AccountOption, CategoryOption } from "@/lib/types";
import { Search, X } from "lucide-react";

export interface FilterState {
  q: string;
  accountId: string;
  categoryId: string;
  type: string;
  from: string;
  to: string;
}

/** Sentinel value for the "all" option (Base UI Select forbids empty values). */
const ALL = "all";

const TYPE_VALUES = ["income", "expense", "transfer"] as const;

export function TransactionFilters({
  filters,
  accounts,
  categories,
}: {
  filters: FilterState;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = React.useState(filters.q);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last value we pushed so external param changes (e.g. Clear)
  // resync the input without clobbering in-flight keystrokes.
  const lastPushed = React.useRef(filters.q);

  React.useEffect(() => {
    if (filters.q !== lastPushed.current) {
      setQ(filters.q);
      lastPushed.current = filters.q;
    }
  }, [filters.q]);

  React.useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const pushParams = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page"); // any filter change resets pagination
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const setParam = React.useCallback(
    (key: string, value: string) => {
      pushParams((p) => {
        if (value) p.set(key, value);
        else p.delete(key);
      });
    },
    [pushParams]
  );

  function onSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastPushed.current = value.trim();
      setParam("q", value.trim());
    }, 300);
  }

  function clearSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQ("");
    lastPushed.current = "";
    setParam("q", "");
  }

  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQ("");
    lastPushed.current = "";
    router.push(pathname);
  }

  const hasFilters = !!(
    filters.q ||
    filters.accountId ||
    filters.categoryId ||
    filters.type ||
    filters.from ||
    filters.to
  );

  return (
    <div
      data-tour="transactions-filters"
      className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-card md:flex-row md:flex-wrap md:items-center"
    >
      {/* Search */}
      <div className="relative min-w-0 flex-1 md:min-w-[220px]">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("transactions.searchPlaceholder")}
          className="pl-8"
          aria-label={t("transactions.searchAria")}
        />
        {q && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={t("transactions.clearSearchAria")}
            className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Account */}
      <IconSelect
        options={accounts.map((a) => ({
          value: a.id,
          label: a.name,
          icon: a.icon,
          color: a.color,
        }))}
        value={filters.accountId || ALL}
        onChange={(v) => setParam("accountId", v && v !== ALL ? v : "")}
        none={{ value: ALL, label: t("transactions.allAccounts") }}
        fallbackIcon="Wallet"
        className="md:w-[160px]"
      />

      {/* Category */}
      <IconSelect
        options={categories.map((c) => ({
          value: c.id,
          label: c.name,
          icon: c.icon,
          color: c.color,
        }))}
        value={filters.categoryId || ALL}
        onChange={(v) => setParam("categoryId", v && v !== ALL ? v : "")}
        none={{ value: ALL, label: t("transactions.allCategories") }}
        fallbackIcon="Tag"
        className="md:w-[170px]"
      />

      {/* Type */}
      <Select
        value={filters.type || ALL}
        onValueChange={(v) => setParam("type", v && v !== ALL ? v : "")}
        items={{
          [ALL]: t("transactions.allTypes"),
          income: t("common.income"),
          expense: t("common.expense"),
          transfer: t("common.transfer"),
        }}
      >
        <SelectTrigger className="w-full md:w-[130px]">
          <SelectValue placeholder={t("transactions.allTypes")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("transactions.allTypes")}</SelectItem>
          {TYPE_VALUES.map((v) => (
            <SelectItem key={v} value={v}>
              {t(`common.${v}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <div className="w-full md:w-[150px]">
          <DatePicker
            value={filters.from}
            onChange={(v) => setParam("from", v)}
            clearable
            placeholder={t("transactions.fromDate")}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">–</span>
        <div className="w-full md:w-[150px]">
          <DatePicker
            value={filters.to}
            onChange={(v) => setParam("to", v)}
            clearable
            placeholder={t("transactions.toDate")}
          />
        </div>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground"
        >
          <X className="size-3.5" />
          {t("action.clear")}
        </Button>
      )}
    </div>
  );
}
