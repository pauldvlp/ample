"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, IconPicker, ColorPicker } from "@/components/shared/form-fields";
import { IconDisc } from "@/components/shared/badges";
import { Icon } from "@/components/shared/icon";
import {
  createCategory,
  updateCategory,
  type CategoryInput,
} from "@/lib/actions/categories";
import { CATEGORY_PALETTE } from "@/lib/constants";
import { useT } from "@/components/providers/settings-provider";
import { CATEGORY_KINDS, type Category, type CategoryKind } from "@/db/schema";
import type { CategoryOption } from "@/lib/types";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";

const NO_PARENT = "__root__";

const KIND_META: Record<
  CategoryKind,
  { labelKey: string; icon: React.ElementType; tone: string }
> = {
  income: {
    labelKey: "common.income",
    icon: ArrowDownLeft,
    tone: "text-positive",
  },
  expense: {
    labelKey: "common.expense",
    icon: ArrowUpRight,
    tone: "text-negative",
  },
  transfer: {
    labelKey: "common.transfer",
    icon: ArrowLeftRight,
    tone: "text-brass",
  },
};

export function CategoryForm({
  category,
  defaultKind = "expense",
  categories = [],
  onDone,
  onCreated,
}: {
  category?: Category | null;
  defaultKind?: CategoryKind;
  /** existing categories, used to offer a parent (sub-category support) */
  categories?: CategoryOption[];
  onDone?: () => void;
  /** fired with the freshly created category (inline-create from a select) */
  onCreated?: (option: CategoryOption) => void;
}) {
  const t = useT();
  const isEdit = !!category;
  const [name, setName] = React.useState(category?.name ?? "");
  const [kind, setKind] = React.useState<CategoryKind>(
    category?.kind ?? defaultKind
  );
  const [parentId, setParentId] = React.useState<string>(
    category?.parentId ?? ""
  );
  const [icon, setIcon] = React.useState<string | null>(category?.icon ?? "Tag");
  const [color, setColor] = React.useState<string | null>(
    category?.color ?? CATEGORY_PALETTE[0]
  );
  const [pending, setPending] = React.useState(false);

  // parent candidates: same kind, top-level only (1-level nesting), never self
  const parentOptions = categories.filter(
    (c) => c.kind === kind && !c.parentId && c.id !== category?.id
  );

  // if the chosen parent stops being valid (kind change), drop it — during
  // render (tracking the previous kind) rather than in an effect, so the
  // invalid parent is never even briefly rendered as selected.
  const [prevKind, setPrevKind] = React.useState(kind);
  if (kind !== prevKind) {
    setPrevKind(kind);
    if (parentId && !parentOptions.some((c) => c.id === parentId)) {
      setParentId("");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // This form lives in a portaled dialog that is a REACT descendant of the
    // form it was opened from (e.g. a transaction/recurring form). React events
    // bubble through the React tree, not the DOM tree, so without this the outer
    // form's onSubmit would also fire — saving the parent record (without the
    // just-created category) and closing its dialog.
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("categories.errName"));
      return;
    }

    const input: CategoryInput = {
      name: trimmed,
      kind,
      icon: icon ?? null,
      color: color ?? null,
      parentId: parentId || null,
    };

    setPending(true);
    const res = isEdit
      ? await updateCategory(category!.id, input)
      : await createCategory(input);
    setPending(false);

    if (res.ok) {
      toast.success(
        isEdit ? t("categories.toastUpdated") : t("categories.toastCreated")
      );
      if (!isEdit && onCreated && "data" in res && res.data) {
        onCreated({
          id: res.data.id,
          name: trimmed,
          kind,
          color: color ?? null,
          icon: icon ?? null,
          parentId: parentId || null,
        });
      }
      onDone?.();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* live preview */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
        <IconDisc icon={icon} color={color} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {name.trim() || t("categories.previewName")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(KIND_META[kind].labelKey)}
          </p>
        </div>
      </div>

      {/* kind segmented control */}
      <Field label={t("categories.type")}>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1">
          {CATEGORY_KINDS.map((k) => {
            const M = KIND_META[k];
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-xs font-medium transition-all sm:px-2 sm:text-sm",
                  active
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <M.icon className={cn("size-3.5 shrink-0 max-sm:hidden", active && M.tone)} />
                <span className="truncate">{t(M.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={t("categories.name")} htmlFor="cat-name">
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("categories.namePlaceholder")}
          autoFocus
        />
      </Field>

      {parentOptions.length > 0 && (
        <Field label={t("categories.parent")} hint={t("categories.parentHint")}>
          <Select
            value={parentId || NO_PARENT}
            onValueChange={(v) => setParentId(v && v !== NO_PARENT ? v : "")}
            items={{
              [NO_PARENT]: t("categories.noParent"),
              ...Object.fromEntries(parentOptions.map((c) => [c.id, c.name])),
            }}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder={t("categories.noParent")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>
                <span className="text-muted-foreground">
                  {t("categories.noParent")}
                </span>
              </SelectItem>
              {parentOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <Icon
                    name={c.icon}
                    className="size-3.5"
                    style={{ color: c.color ?? undefined }}
                  />
                  <span className="truncate">{c.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Field label={t("categories.icon")}>
          <IconPicker value={icon} onChange={setIcon} color={color} />
        </Field>
        <Field label={t("categories.color")}>
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending
            ? t("action.saving")
            : isEdit
              ? t("action.saveChanges")
              : t("categories.create")}
        </Button>
      </div>
    </form>
  );
}
