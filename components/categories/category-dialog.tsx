"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CategoryForm } from "./category-form";
import { useT } from "@/components/providers/settings-provider";
import type { Category, CategoryKind } from "@/db/schema";
import type { CategoryOption } from "@/lib/types";

export function CategoryDialog({
  category,
  defaultKind,
  categories,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onCreated,
}: {
  category?: Category | null;
  defaultKind?: CategoryKind;
  categories?: CategoryOption[];
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (option: CategoryOption) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const isEdit = !!category;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("categories.editTitle") : t("categories.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("categories.editDesc") : t("categories.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          category={category}
          defaultKind={defaultKind}
          categories={categories}
          onDone={() => setOpen(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  );
}
