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
import { DebtForm } from "./debt-form";
import { useT } from "@/components/providers/settings-provider";
import type { AccountOption, PayeeOption } from "@/lib/types";
import type { DebtKind } from "@/db/schema";
import type { DebtWithOutstanding } from "@/lib/data/debts";

export function DebtDialog({
  accounts,
  payees,
  debt,
  defaultKind,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  accounts: AccountOption[];
  payees?: PayeeOption[];
  debt?: DebtWithOutstanding | null;
  defaultKind?: DebtKind;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const isEdit = !!debt;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("debts.editTitle") : t("debts.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("debts.editDesc") : t("debts.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <DebtForm
          accounts={accounts}
          payees={payees}
          debt={debt}
          defaultKind={defaultKind}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
