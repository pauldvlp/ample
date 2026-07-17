'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/shared/section-card';
import { StatTile } from '@/components/shared/stat-tile';
import { EmptyState } from '@/components/shared/empty-state';
import { IconDisc } from '@/components/shared/badges';
import { Amount } from '@/components/shared/amount';
import { Meter } from '@/components/charts/meter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DebtDialog } from './debt-dialog';
import { DebtPaymentDialog } from './debt-payment-dialog';
import { DebtScheduleDialog } from './debt-schedule-dialog';
import { useSettings } from '@/components/providers/settings-provider';
import { formatDate } from '@/lib/format';
import { deleteDebt, setDebtStatus } from '@/lib/actions/debts';
import type { DebtWithOutstanding } from '@/lib/data/debts';
import type { AccountOption, PayeeOption } from '@/lib/types';
import type { DebtKind } from '@/db/schema';
import {
  MoreHorizontal,
  Plus,
  HandCoins,
  Pencil,
  Trash2,
  CheckCircle2,
  RotateCcw,
  CalendarClock,
} from 'lucide-react';

export function DebtsView({
  debts,
  accounts,
  payees = [],
}: {
  debts: DebtWithOutstanding[];
  accounts: AccountOption[];
  payees?: PayeeOption[];
}) {
  const { t } = useSettings();
  const receivables = debts.filter((d) => d.kind === 'receivable');
  const payables = debts.filter((d) => d.kind === 'payable');

  const totalReceivable = receivables
    .filter((d) => d.status === 'open')
    .reduce((s, d) => s + d.outstanding, 0);
  const totalPayable = payables
    .filter((d) => d.status === 'open')
    .reduce((s, d) => s + d.outstanding, 0);

  return (
    <div className="space-y-4">
      {/* summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-tour="debts-summary">
        <StatTile
          label={t('debts.totalOwedToMe')}
          value={totalReceivable}
          icon="HandHeart"
          iconColor="var(--positive)"
          sub={t('debts.countOpen', { n: receivables.filter((d) => d.status === 'open').length })}
        />
        <StatTile
          label={t('debts.totalIOwe')}
          value={totalPayable}
          icon="CreditCard"
          iconColor="var(--negative)"
          sub={t('debts.countOpen', { n: payables.filter((d) => d.status === 'open').length })}
        />
        <StatTile
          label={t('debts.netPosition')}
          value={totalReceivable - totalPayable}
          icon="TrendingUp"
          iconColor="var(--brass)"
          sub={t('debts.netHint')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DebtColumn
          kind="receivable"
          title={t('debts.owedToMe')}
          description={t('debts.owedToMeDesc')}
          debts={receivables}
          accounts={accounts}
          payees={payees}
        />
        <DebtColumn
          kind="payable"
          title={t('debts.iOwe')}
          description={t('debts.iOweDesc')}
          debts={payables}
          accounts={accounts}
          payees={payees}
        />
      </div>
    </div>
  );
}

function DebtColumn({
  kind,
  title,
  description,
  debts,
  accounts,
  payees,
}: {
  kind: DebtKind;
  title: string;
  description: string;
  debts: DebtWithOutstanding[];
  accounts: AccountOption[];
  payees: PayeeOption[];
}) {
  const { t } = useSettings();
  return (
    <SectionCard
      title={title}
      description={description}
      action={
        <DebtDialog
          accounts={accounts}
          payees={payees}
          defaultKind={kind}
          trigger={
            <Button variant="outline" size="xs">
              <Plus className="size-3.5" />
              {t('debts.add')}
            </Button>
          }
        />
      }
    >
      {debts.length ? (
        <div className="-mx-2">
          {debts.map((d) => (
            <DebtRow key={d.id} debt={d} accounts={accounts} payees={payees} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={kind === 'receivable' ? 'HandHeart' : 'CreditCard'}
          title={t('debts.emptyTitle')}
          description={
            kind === 'receivable' ? t('debts.emptyReceivableDesc') : t('debts.emptyPayableDesc')
          }
        />
      )}
    </SectionCard>
  );
}

function DebtRow({
  debt,
  accounts,
  payees,
}: {
  debt: DebtWithOutstanding;
  accounts: AccountOption[];
  payees: PayeeOption[];
}) {
  const { t, foreign, currency: base } = useSettings();
  const [editOpen, setEditOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [planOpen, setPlanOpen] = React.useState(false);

  const settled = debt.status === 'settled' || debt.outstanding <= 0;
  const pct = debt.principal > 0 ? debt.paid / debt.principal : 0;
  const accountName = accounts.find((a) => a.id === debt.accountId)?.name ?? null;
  const hasOriginal =
    debt.originalAmount != null && !!debt.originalCurrency && debt.originalCurrency !== base;

  const hasPlan = debt.installments.length > 0;
  const nextInstallment = debt.installments.find((i) => !i.paidPaymentId) ?? null;
  const paidCount = debt.installments.filter((i) => i.paidPaymentId).length;

  async function remove() {
    const res = await deleteDebt(debt.id);
    if (res.ok) toast.success(t('debts.toastDeleted'));
    else toast.error(res.error);
  }

  async function toggleSettled() {
    const res = await setDebtStatus(debt.id, settled ? 'open' : 'settled');
    if (res.ok) toast.success(settled ? t('debts.reopenedToast') : t('debts.settledToast'));
    else toast.error(res.error);
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60',
        settled && 'opacity-55',
      )}
    >
      <IconDisc icon={debt.icon ?? 'HandCoins'} color={debt.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{debt.counterparty}</p>
          {settled && (
            <span className="shrink-0 rounded-full bg-positive/12 px-1.5 py-0.5 text-[0.6rem] font-medium text-positive">
              {t('debts.settled')}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[
            debt.name,
            hasPlan
              ? nextInstallment
                ? t('debts.nextInstallment', {
                    date: formatDate(new Date(nextInstallment.dueDate)),
                  })
                : null
              : debt.dueDate
                ? t('debts.due', { date: formatDate(debt.dueDate) })
                : null,
          ]
            .filter(Boolean)
            .join('  ·  ') || t('debts.noReason')}
        </p>
        {hasPlan && (
          <p className="text-[0.6rem] text-muted-foreground tnum">
            {t('debts.installmentsProgress', {
              paid: paidCount,
              total: debt.installments.length,
            })}
          </p>
        )}
        {!settled && debt.paid > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <Meter value={pct} height={4} tone="brand" color="var(--positive)" className="flex-1" />
            <span className="shrink-0 text-[0.6rem] text-muted-foreground tnum">
              {Math.round(pct * 100)}%
            </span>
          </div>
        )}
      </div>

      <div className="text-right">
        <Amount value={debt.outstanding} abs className="text-sm font-medium" />
        {hasOriginal ? (
          <p className="sensitive tnum text-[0.6rem] text-muted-foreground">
            {foreign(Math.abs(debt.originalAmount!), debt.originalCurrency!)}
          </p>
        ) : debt.paid > 0 && !settled ? (
          <p className="text-[0.6rem] text-muted-foreground">
            <Amount value={debt.paid} abs className="tnum" /> {t('debts.paidLower')}
          </p>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t('debts.actions')}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-44">
          {!settled && (
            <DropdownMenuItem onClick={() => setPayOpen(true)}>
              <HandCoins className="size-4" />
              {t('debts.recordPayment')}
            </DropdownMenuItem>
          )}
          {hasPlan && (
            <DropdownMenuItem onClick={() => setPlanOpen(true)}>
              <CalendarClock className="size-4" />
              {t('debts.viewPlan')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {t('action.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleSettled}>
            {settled ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
            {settled ? t('debts.reopen') : t('debts.markSettled')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={remove}>
            <Trash2 className="size-4" />
            {t('action.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DebtDialog
        accounts={accounts}
        payees={payees}
        debt={debt}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DebtPaymentDialog
        debt={debt}
        accountName={accountName}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
      {hasPlan && <DebtScheduleDialog debt={debt} open={planOpen} onOpenChange={setPlanOpen} />}
    </div>
  );
}
