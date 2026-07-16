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
import { TransactionForm } from "./transaction-form";
import { useT } from "@/components/providers/settings-provider";
import type {
  AccountOption,
  CategoryOption,
  TagOption,
  PayeeOption,
} from "@/lib/types";
import type { TransactionEnriched } from "@/lib/data/transactions";

export function TransactionDialog({
  accounts,
  categories,
  tags,
  payees,
  transaction,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  tags: TagOption[];
  payees?: PayeeOption[];
  transaction?: TransactionEnriched | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const isEdit = !!transaction;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("transactions.editTitle") : t("transactions.new")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("transactions.editDesc") : t("transactions.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          accounts={accounts}
          categories={categories}
          tags={tags}
          payees={payees}
          transaction={transaction}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
