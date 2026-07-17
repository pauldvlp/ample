'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { GoalForm } from './goal-form';
import { useT } from '@/components/providers/settings-provider';
import type { GoalWithProgress } from '@/lib/data/goals';
import type { AccountWithBalance } from '@/lib/data/accounts';

export function GoalDialog({
  goal,
  accounts,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  goal?: GoalWithProgress | null;
  accounts: AccountWithBalance[];
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const isEdit = !!goal;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('goals.editTitle') : t('goals.newTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('goals.editDescription') : t('goals.newDescription')}
          </DialogDescription>
        </DialogHeader>
        <GoalForm goal={goal} accounts={accounts} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
