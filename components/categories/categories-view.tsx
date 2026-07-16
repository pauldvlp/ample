"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { IconDisc } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CategoryDialog } from "./category-dialog";
import { deleteCategory, setCategoryArchived } from "@/lib/actions/categories";
import { translateCategories } from "@/lib/actions/ai";
import { useT, useSettings } from "@/components/providers/settings-provider";
import type { CategoryWithUsage } from "@/lib/data/categories";
import type { CategoryOption } from "@/lib/types";
import type { CategoryKind } from "@/db/schema";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Languages,
  Loader2,
} from "lucide-react";

const KIND_ICON: Record<CategoryKind, string> = {
  income: "TrendingUp",
  expense: "ShoppingCart",
  transfer: "Repeat",
};

/* -------------------------------------------------------------------------- */

export function AddCategoryButton() {
  const t = useT();
  return (
    <CategoryDialog
      trigger={
        <Button data-tour="categories-add">
          <Plus className="size-4" />
          {t("categories.add")}
        </Button>
      }
    />
  );
}

/** AI-powered bulk translation of category names to the current UI language.
 *  Only shown when the AI assistant is enabled. */
export function TranslateCategoriesButton() {
  const { t, aiEnabled, language } = useSettings();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  if (!aiEnabled) return null;
  const langLabel = language === "es" ? "español" : "English";

  async function run() {
    setPending(true);
    const res = await translateCategories(language);
    setPending(false);
    if (res.ok && res.data) {
      if (res.data.updated > 0) {
        toast.success(t("categories.translated", { n: res.data.updated }));
        router.refresh();
      } else {
        toast.info(t("categories.translateNoop", { lang: langLabel }));
      }
    } else {
      toast.error(
        !res.ok && res.error === "ai-disabled"
          ? t("ai.disabledShort")
          : t("categories.translateError", {
              error: !res.ok ? res.error : "",
            })
      );
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Languages className="size-4" />
          )}
          <span className="hidden sm:inline">{t("categories.translate")}</span>
        </Button>
      }
      title={t("categories.translateTitle", { lang: langLabel })}
      description={t("categories.translateBody", { lang: langLabel })}
      confirmLabel={t("categories.translate")}
      onConfirm={run}
    />
  );
}

const toOption = (c: CategoryWithUsage): CategoryOption => ({
  id: c.id,
  name: c.name,
  kind: c.kind,
  color: c.color,
  icon: c.icon,
  parentId: c.parentId,
});

/** Order a flat list as parent → its children (indented), keeping orphans at
 *  the top level so nothing is hidden. */
function nest(
  list: CategoryWithUsage[]
): { cat: CategoryWithUsage; indent: boolean }[] {
  const ids = new Set(list.map((c) => c.id));
  const roots = list.filter((c) => !c.parentId || !ids.has(c.parentId));
  const out: { cat: CategoryWithUsage; indent: boolean }[] = [];
  for (const r of roots) {
    out.push({ cat: r, indent: false });
    for (const child of list.filter((c) => c.parentId === r.id)) {
      out.push({ cat: child, indent: true });
    }
  }
  return out;
}

export function CategoriesView({
  categories,
}: {
  categories: CategoryWithUsage[];
}) {
  const byKind = (k: CategoryKind) => categories.filter((c) => c.kind === k);
  const transfers = byKind("transfer");
  const allOptions = categories.map(toOption);

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-tour="categories-groups">
      <CategoryGroup kind="income" items={byKind("income")} allOptions={allOptions} />
      <CategoryGroup kind="expense" items={byKind("expense")} allOptions={allOptions} />
      {transfers.length > 0 && (
        <div className="lg:col-span-2">
          <CategoryGroup kind="transfer" items={transfers} allOptions={allOptions} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CategoryGroup({
  kind,
  items,
  allOptions,
}: {
  kind: CategoryKind;
  items: CategoryWithUsage[];
  allOptions: CategoryOption[];
}) {
  const t = useT();
  const active = items.filter((c) => !c.isArchived);
  const archived = items.filter((c) => c.isArchived);
  const ordered = [...nest(active), ...nest(archived)];
  const label =
    kind === "income"
      ? t("common.income")
      : kind === "expense"
        ? t("common.expense")
        : t("categories.groupTransfer");
  const kindLower = label.toLowerCase();

  return (
    <SectionCard
      title={label}
      description={
        active.length === 1
          ? t("categories.countOne", { n: active.length })
          : t("categories.count", { n: active.length })
      }
      action={
        <CategoryDialog
          defaultKind={kind}
          categories={allOptions}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("categories.addKind", { kind: kindLower })}
            >
              <Plus className="size-4" />
            </Button>
          }
        />
      }
    >
      {ordered.length === 0 ? (
        <EmptyState
          icon={KIND_ICON[kind]}
          title={t("categories.emptyTitle", { kind: kindLower })}
          description={t("categories.emptyDesc", { kind: kindLower })}
          action={
            <CategoryDialog
              defaultKind={kind}
              categories={allOptions}
              trigger={
                <Button variant="outline" size="sm">
                  <Plus className="size-4" />
                  {t("categories.add")}
                </Button>
              }
            />
          }
          className="py-10"
        />
      ) : (
        <div className="-mx-1 flex flex-col gap-0.5">
          {ordered.map(({ cat, indent }) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              indent={indent}
              allOptions={allOptions}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */

function CategoryRow({
  category: c,
  indent = false,
  allOptions,
}: {
  category: CategoryWithUsage;
  indent?: boolean;
  allOptions: CategoryOption[];
}) {
  const t = useT();
  const [editOpen, setEditOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function toggleArchive() {
    setBusy(true);
    const res = await setCategoryArchived(c.id, !c.isArchived);
    setBusy(false);
    if (res.ok)
      toast.success(
        c.isArchived
          ? t("categories.toastRestored")
          : t("categories.toastArchived")
      );
    else toast.error(res.error);
  }

  async function handleDelete() {
    const res = await deleteCategory(c.id);
    if (res.ok) toast.success(t("categories.toastDeleted"));
    else toast.error(res.error);
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/50",
          c.isArchived && "opacity-60",
          indent && "ml-5 border-l border-border/60 pl-3"
        )}
      >
        <IconDisc icon={c.icon} color={c.color} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {c.name}
            </p>
            {c.isArchived && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {t("categories.archived")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {c.txCount === 1
              ? t("categories.txCountOne", { n: c.txCount })
              : t("categories.txCount", { n: c.txCount })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("categories.rowActions", { name: c.name })}
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 aria-expanded:opacity-100 max-sm:size-9 max-sm:opacity-100"
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
            <DropdownMenuItem disabled={busy} onClick={toggleArchive}>
              {c.isArchived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
              {c.isArchived ? t("categories.restore") : t("categories.archive")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title={t("categories.deleteTitle")}
              description={`${t("categories.deleteDesc", { name: c.name })}${
                c.txCount > 0
                  ? c.txCount === 1
                    ? t("categories.deleteDescTxOne", { n: c.txCount })
                    : t("categories.deleteDescTx", { n: c.txCount })
                  : ""
              }`}
              confirmLabel={t("action.delete")}
              onConfirm={handleDelete}
              trigger={
                <DropdownMenuItem variant="destructive" closeOnClick={false}>
                  <Trash2 className="size-4" />
                  {t("action.delete")}
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CategoryDialog
        category={c}
        categories={allOptions}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
