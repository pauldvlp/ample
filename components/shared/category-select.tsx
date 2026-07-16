"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { CategoryDialog } from "@/components/categories/category-dialog";
import { useT } from "@/components/providers/settings-provider";
import type { CategoryOption } from "@/lib/types";
import type { CategoryKind } from "@/db/schema";
import { Plus } from "lucide-react";

const NONE = "__none__";

/** A tiny icon+label node used both in the list and in the closed trigger. */
function CategoryLabel({
  cat,
  indent = false,
}: {
  cat: CategoryOption;
  indent?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {indent && (
        <span className="text-muted-foreground/60" aria-hidden>
          ↳
        </span>
      )}
      <Icon
        name={cat.icon}
        className="size-3.5 shrink-0"
        style={{ color: cat.color ?? undefined }}
      />
      <span className="truncate">{cat.name}</span>
    </span>
  );
}

/**
 * Category picker used across the app. Fixes the old selects (which showed only
 * a color dot and no value in the trigger): it renders the category icon in the
 * list AND in the closed control, groups sub-categories under their parents,
 * truncates long names, and can create a new category inline.
 */
export function CategorySelect({
  categories,
  value,
  onChange,
  kind,
  placeholder,
  allowCreate = true,
  allowUncategorized = true,
  id,
  className,
}: {
  categories: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
  /** restrict options to this kind (income/expense) */
  kind?: CategoryKind;
  placeholder?: string;
  allowCreate?: boolean;
  allowUncategorized?: boolean;
  id?: string;
  className?: string;
}) {
  const t = useT();
  const [extra, setExtra] = React.useState<CategoryOption[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);

  const pool = React.useMemo(() => {
    // Dedupe by id: a freshly inline-created category lives in `extra` until the
    // parent revalidation feeds it back through `categories`, at which point it
    // would appear twice (→ duplicate React keys). Props win over the local copy.
    const seen = new Set<string>();
    const all = [...categories, ...extra].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return kind ? all.filter((c) => c.kind === kind) : all;
  }, [categories, extra, kind]);

  // parent -> children ordering; orphan children (parent not in pool) surface
  // at the top level so nothing is hidden.
  const { ordered, byId } = React.useMemo(() => {
    const byId = new Map(pool.map((c) => [c.id, c]));
    const parents = pool.filter((c) => !c.parentId || !byId.has(c.parentId));
    const list: { cat: CategoryOption; indent: boolean }[] = [];
    for (const p of parents) {
      list.push({ cat: p, indent: false });
      for (const child of pool.filter((c) => c.parentId === p.id)) {
        list.push({ cat: child, indent: true });
      }
    }
    return { ordered: list, byId };
  }, [pool]);

  const items = React.useMemo(() => {
    const map: Record<string, React.ReactNode> = {
      [NONE]: (
        <span className="text-muted-foreground">
          {placeholder ?? t("common.uncategorized")}
        </span>
      ),
    };
    for (const c of pool) {
      map[c.id] = <CategoryLabel cat={c} indent={!!c.parentId && byId.has(c.parentId)} />;
    }
    return map;
  }, [pool, byId, placeholder, t]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select
        value={value || NONE}
        onValueChange={(v) => onChange(v && v !== NONE ? v : "")}
        items={items}
      >
        <SelectTrigger id={id} className="w-full min-w-0">
          <SelectValue placeholder={placeholder ?? t("common.uncategorized")} />
        </SelectTrigger>
        <SelectContent>
          {allowUncategorized && (
            <SelectItem value={NONE}>
              <span className="text-muted-foreground">
                {t("common.uncategorized")}
              </span>
            </SelectItem>
          )}
          {ordered.map(({ cat, indent }) => (
            <SelectItem key={cat.id} value={cat.id}>
              <CategoryLabel cat={cat} indent={indent} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allowCreate && (
        <CategoryDialog
          defaultKind={kind}
          categories={[...categories, ...extra]}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(opt) => {
            setExtra((prev) => [...prev, opt]);
            onChange(opt.id);
          }}
          trigger={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={t("categorySelect.create")}
            >
              <Plus className="size-4" />
            </Button>
          }
        />
      )}
    </div>
  );
}
