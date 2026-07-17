'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Field, AmountInput } from '@/components/shared/form-fields';
import { DatePicker } from '@/components/shared/date-picker';
import { useSettings } from '@/components/providers/settings-provider';
import { addDebtPayment } from '@/lib/actions/debts';
import { toDateInputValue, fromDateInputValue } from '@/lib/format';
import { fromCents } from '@/lib/money';
import type { DebtWithOutstanding } from '@/lib/data/debts';

export function DebtPaymentDialog({
  debt,
  accountName,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  debt: DebtWithOutstanding;
  /** name of the debt's linked account, if any */
  accountName?: string | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t, money } = useSettings();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const [amount, setAmount] = React.useState(String(fromCents(debt.outstanding)));
  const [date, setDate] = React.useState(toDateInputValue(new Date()));
  const [note, setNote] = React.useState('');
  const [record, setRecord] = React.useState(!!debt.accountId);
  const [pending, setPending] = React.useState(false);

  // reset the amount to the current outstanding whenever the dialog opens (or
  // the outstanding/linked-account changes while open) — during render
  // (tracking the previous values) rather than in an effect.
  const [prevReset, setPrevReset] = React.useState({
    open,
    outstanding: debt.outstanding,
    accountId: debt.accountId,
  });
  if (
    open !== prevReset.open ||
    debt.outstanding !== prevReset.outstanding ||
    debt.accountId !== prevReset.accountId
  ) {
    setPrevReset({ open, outstanding: debt.outstanding, accountId: debt.accountId });
    if (open) {
      setAmount(String(fromCents(debt.outstanding)));
      setDate(toDateInputValue(new Date()));
      setNote('');
      setRecord(!!debt.accountId);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(t('debts.errAmount'));
      return;
    }
    setPending(true);
    const res = await addDebtPayment({
      debtId: debt.id,
      amount: amt,
      date: fromDateInputValue(date).getTime(),
      note: note.trim() || null,
      recordTransaction: record && !!debt.accountId,
    });
    setPending(false);
    if (res.ok) {
      toast.success(t('debts.paymentToast'));
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('debts.recordPayment')}</DialogTitle>
          <DialogDescription>
            {t('debts.outstandingIs', { amount: money(debt.outstanding) })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('debts.paymentAmount')} htmlFor="pay-amount">
              <AmountInput id="pay-amount" value={amount} onChange={setAmount} autoFocus />
            </Field>
            <Field label={t('common.date')}>
              <DatePicker value={date} onChange={setDate} />
            </Field>
          </div>

          <Field label={t('debts.paymentNote')} hint={t('common.optional')}>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('debts.paymentNotePlaceholder')}
            />
          </Field>

          {debt.accountId && (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3.5 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t('debts.recordMovement')}</span>
                <span className="block text-xs text-muted-foreground">
                  {debt.kind === 'receivable'
                    ? t('debts.recordMovementIn', { account: accountName ?? '' })
                    : t('debts.recordMovementOut', { account: accountName ?? '' })}
                </span>
              </span>
              <Switch checked={record} onCheckedChange={setRecord} />
            </label>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? t('action.saving') : t('debts.confirmPayment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
