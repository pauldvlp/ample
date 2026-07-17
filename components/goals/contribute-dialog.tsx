'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, AmountInput } from '@/components/shared/form-fields';
import { Amount } from '@/components/shared/amount';
import { useT } from '@/components/providers/settings-provider';
import { addContribution } from '@/lib/actions/goals';
import { fromCents } from '@/lib/money';

type Mode = 'add' | 'withdraw';

export function ContributeDialog({
  goalId,
  goalName,
  remaining = 0,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  goalId: string;
  goalName: string;
  /** cents left to reach the target — enables the "fund the rest" shortcut */
  remaining?: number;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const [mode, setMode] = React.useState<Mode>('add');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [pending, setPending] = React.useState(false);

  // reset the form whenever the dialog is closed — during render (tracking
  // the previous open state) rather than in an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setMode('add');
      setAmount('');
      setNote('');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(t('goals.errorAmount'));
      return;
    }
    setPending(true);
    const res = await addContribution(
      goalId,
      mode === 'withdraw' ? -amt : amt,
      note.trim() || undefined,
    );
    setPending(false);
    if (res.ok) {
      toast.success(
        mode === 'withdraw' ? t('goals.toastWithdrawal') : t('goals.toastContribution'),
      );
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
          <DialogTitle>{t('goals.contributeTo', { name: goalName })}</DialogTitle>
          <DialogDescription>{t('goals.contributeDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1">
            {(['add', 'withdraw'] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-lg px-2 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'add' ? t('goals.addFunds') : t('goals.withdraw')}
                </button>
              );
            })}
          </div>

          <Field label={t('common.amount')} htmlFor="contribute-amount">
            <AmountInput id="contribute-amount" value={amount} onChange={setAmount} autoFocus />
          </Field>

          {mode === 'add' && remaining > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(fromCents(remaining)))}
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              {t('goals.fundRemaining')}{' '}
              <Amount value={remaining} decimals={false} sensitive={false} />
            </button>
          )}

          <Field label={t('goals.note')} htmlFor="contribute-note">
            <Input
              id="contribute-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('goals.notePlaceholder')}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending
                ? t('action.saving')
                : mode === 'withdraw'
                  ? t('goals.recordWithdrawal')
                  : t('goals.addContribution')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
