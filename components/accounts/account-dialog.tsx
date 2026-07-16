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
import { AccountForm } from "./account-form";
import { useT } from "@/components/providers/settings-provider";
import type { Account } from "@/db/schema";

export function AccountDialog({
  account,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  account?: Account | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const isEdit = !!account;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("accounts.editTitle") : t("accounts.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("accounts.editDesc") : t("accounts.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <AccountForm account={account} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
