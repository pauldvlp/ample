'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Undo2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Amount } from '@/components/shared/amount';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { useSettings } from '@/components/providers/settings-provider';
import { formatDate } from '@/lib/format';
import { markInstallmentPaid, revertInstallment } from '@/lib/actions/debts';
import type { DebtWithOutstanding } from '@/lib/data/debts';

/** A debt's payment plan: its scheduled installments, each markable as paid or
 *  revertable. Prop-driven — reflects fresh data after each action revalidates. */
export function DebtScheduleDialog({
  debt,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  debt: DebtWithOutstanding;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useSettings();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const [busy, setBusy] = React.useState<string | null>(null);

  const installments = debt.installments;

  async function markPaid(id: string) {
    setBusy(id);
    const res = await markInstallmentPaid(id);
    setBusy(null);
    if (res.ok) toast.success(t('debts.markPaidToast'));
    else toast.error(res.error);
  }
  async function revert(id: string) {
    setBusy(id);
    const res = await revertInstallment(id);
    setBusy(null);
    if (res.ok) toast.success(t('debts.revertInstallmentToast'));
    else toast.error(res.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('debts.plan')}</DialogTitle>
          <DialogDescription>{t('debts.planDialogDesc')}</DialogDescription>
        </DialogHeader>

        {installments.length === 0 ? (
          <EmptyState
            icon="CalendarClock"
            title={t('debts.planEmptyTitle')}
            description={t('debts.planEmptyDesc')}
          />
        ) : (
          <ul className="-mx-1 max-h-[52vh] divide-y divide-border/60 overflow-y-auto overscroll-contain">
            {installments.map((inst) => {
              const paid = !!inst.paidPaymentId;
              return (
                <li key={inst.id} className="flex items-center gap-3 px-1 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatDate(new Date(inst.dueDate))}
                    </p>
                    <span
                      className={
                        paid
                          ? 'text-[0.65rem] font-medium text-positive'
                          : 'text-[0.65rem] text-muted-foreground'
                      }
                    >
                      {paid ? t('debts.paidBadge') : t('debts.pendingBadge')}
                    </span>
                  </div>
                  <Amount value={inst.amount} abs className="shrink-0 text-sm font-medium" />
                  {paid ? (
                    <ConfirmDialog
                      title={t('debts.confirmRevertInstallment')}
                      description={t('debts.confirmRevertInstallmentDesc')}
                      confirmLabel={t('debts.revertInstallment')}
                      onConfirm={() => revert(inst.id)}
                      trigger={
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={busy === inst.id}
                          aria-label={t('debts.revertInstallment')}
                          className="shrink-0 gap-1"
                        >
                          <Undo2 className="size-3.5" />
                          <span className="hidden sm:inline">{t('debts.revertInstallment')}</span>
                        </Button>
                      }
                    />
                  ) : (
                    <ConfirmDialog
                      title={t('debts.confirmMarkPaid')}
                      description={t('debts.confirmMarkPaidDesc')}
                      confirmLabel={t('debts.markPaid')}
                      onConfirm={() => markPaid(inst.id)}
                      trigger={
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={busy === inst.id}
                          aria-label={t('debts.markPaid')}
                          className="shrink-0 gap-1"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span className="hidden sm:inline">{t('debts.markPaid')}</span>
                        </Button>
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
