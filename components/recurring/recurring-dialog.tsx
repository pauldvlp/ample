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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RecurringForm } from './recurring-form';
import { RecurringHistory } from './recurring-history';
import { useT } from '@/components/providers/settings-provider';
import type { AccountOption, CategoryOption, PayeeOption } from '@/lib/types';
import type { RecurringWithRefs } from '@/lib/data/recurring';

export function RecurringDialog({
  accounts,
  categories,
  payees,
  rule,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  payees?: PayeeOption[];
  rule?: RecurringWithRefs | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const isEdit = !!rule;
  const [tab, setTab] = React.useState('edit');

  // Reset to the edit tab on close (not on open) so the next open renders the
  // form immediately — resetting on open would first paint the stale history
  // panel and fire a wasted fetch before this switched tabs. Done during
  // render (tracking the previous open state) rather than in an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setTab('edit');
  }

  const form = (
    <RecurringForm
      // Remount when this rule's schedule changes (a post or an in-dialog
      // revert) so the keepMounted form picks up the fresh nextDueDate instead
      // of later saving a stale value that would undo the rollback.
      key={rule ? `${rule.id}:${rule.nextDueDate?.getTime() ?? 0}:${rule.postedCount}` : 'new'}
      accounts={accounts}
      categories={categories}
      payees={payees}
      rule={rule}
      onDone={() => setOpen(false)}
    />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('recurring.editTitle') : t('recurring.newTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('recurring.editDesc') : t('recurring.newDesc')}
          </DialogDescription>
        </DialogHeader>

        {isEdit ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">{t('recurring.tabEdit')}</TabsTrigger>
              <TabsTrigger value="history">{t('recurring.tabHistory')}</TabsTrigger>
            </TabsList>
            {/* keepMounted the form so typed edits survive a tab switch; the
                history remounts (and refetches) each time it's opened. */}
            <TabsContent value="edit" keepMounted>
              {form}
            </TabsContent>
            <TabsContent value="history">
              <RecurringHistory ruleId={rule!.id} />
            </TabsContent>
          </Tabs>
        ) : (
          form
        )}
      </DialogContent>
    </Dialog>
  );
}
