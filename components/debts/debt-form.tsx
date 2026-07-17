'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Field, AmountInput } from '@/components/shared/form-fields';
import { IconSelect } from '@/components/shared/icon-select';
import { PayeeCombobox } from '@/components/shared/payee-combobox';
import {
  InstallmentsEditor,
  draftKey,
  type PlanMode,
  type InstallmentDraft,
} from './installments-editor';
import { useSettings } from '@/components/providers/settings-provider';
import { createDebt, updateDebt, type DebtInput } from '@/lib/actions/debts';
import { toDateInputValue, fromDateInputValue } from '@/lib/format';
import { fromCents, toCents, formatMoney } from '@/lib/money';
import { CURRENCIES } from '@/lib/constants';
import type { AccountOption, PayeeOption } from '@/lib/types';
import type { DebtWithOutstanding } from '@/lib/data/debts';
import type { DebtKind } from '@/db/schema';
import { HandCoins, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const NO_ACCOUNT = '__none__';

const KIND_META: Record<
  DebtKind,
  { labelKey: string; icon: React.ElementType; tone: string; defaultIcon: string }
> = {
  receivable: {
    labelKey: 'debts.owedToMe',
    icon: ArrowDownLeft,
    tone: 'text-positive',
    defaultIcon: 'HandHeart',
  },
  payable: {
    labelKey: 'debts.iOwe',
    icon: ArrowUpRight,
    tone: 'text-negative',
    defaultIcon: 'CreditCard',
  },
};

export function DebtForm({
  accounts,
  payees = [],
  debt,
  defaultKind = 'receivable',
  onDone,
}: {
  accounts: AccountOption[];
  payees?: PayeeOption[];
  debt?: DebtWithOutstanding | null;
  defaultKind?: DebtKind;
  onDone?: () => void;
}) {
  const { t, currency: base, locale, rates, money, toBase } = useSettings();
  const isEdit = !!debt;

  const [kind, setKind] = React.useState<DebtKind>(debt?.kind ?? defaultKind);
  const [counterparty, setCounterparty] = React.useState(debt?.counterparty ?? '');
  const [name, setName] = React.useState(debt?.name ?? '');
  const [currency, setCurrency] = React.useState(debt?.originalCurrency ?? base);
  const [amount, setAmount] = React.useState(
    debt ? String(Math.abs(fromCents(debt.originalAmount ?? debt.principal))) : '',
  );
  const [accountId, setAccountId] = React.useState<string>(debt?.accountId ?? NO_ACCOUNT);
  const [notes, setNotes] = React.useState(debt?.notes ?? '');
  const [recordMovement, setRecordMovement] = React.useState(true);
  const [pending, setPending] = React.useState(false);

  // payment plan (cuotas). Seed from existing pending installments, or from a
  // legacy dueDate as a single full-amount installment.
  const pendingInstallments = React.useMemo(
    () => (debt?.installments ?? []).filter((i) => !i.paidPaymentId),
    [debt],
  );
  const [planMode, setPlanMode] = React.useState<PlanMode>(
    pendingInstallments.length > 0 || debt?.dueDate ? 'scheduled' : 'none',
  );
  const [rows, setRows] = React.useState<InstallmentDraft[]>(() =>
    pendingInstallments.length > 0
      ? pendingInstallments.map((i) => ({
          key: draftKey(),
          date: toDateInputValue(i.dueDate),
          amount: String(fromCents(i.amount)),
        }))
      : debt?.dueDate
        ? [
            {
              key: draftKey(),
              date: toDateInputValue(debt.dueDate),
              amount: String(fromCents(debt.outstanding || debt.principal)),
            },
          ]
        : [],
  );

  const linkedAccount =
    accountId !== NO_ACCOUNT ? (accounts.find((a) => a.id === accountId) ?? null) : null;
  // Only new debts post an opening movement; editing never re-posts cash.
  const canRecord = !isEdit && !!linkedAccount;

  // total still to schedule (base cents): principal (in base) minus what's paid.
  const totalBaseCents = toBase(toCents(Number(amount) || 0), currency);
  const targetCents = Math.max(0, totalBaseCents - (debt?.paid ?? 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!counterparty.trim()) {
      toast.error(t('debts.errCounterparty'));
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(t('debts.errAmount'));
      return;
    }

    const installments =
      planMode === 'scheduled'
        ? rows
            .filter((r) => r.date && Number(r.amount) > 0)
            .map((r) => ({
              dueDate: fromDateInputValue(r.date).getTime(),
              amount: Number(r.amount),
            }))
        : [];

    const input: DebtInput = {
      kind,
      counterparty: counterparty.trim(),
      name: name.trim() || null,
      amount: amt,
      currency,
      accountId: accountId === NO_ACCOUNT ? null : accountId,
      dueDate: null,
      installments,
      icon: KIND_META[kind].defaultIcon,
      color: kind === 'receivable' ? '#2C6152' : '#B5674C',
      notes: notes.trim() || null,
      recordTransaction: canRecord && recordMovement,
    };

    setPending(true);
    const res = isEdit ? await updateDebt(debt!.id, input) : await createDebt(input);
    setPending(false);

    if (res.ok) {
      toast.success(isEdit ? t('debts.toastUpdated') : t('debts.toastCreated'));
      onDone?.();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* kind segmented control */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1">
        {(Object.keys(KIND_META) as DebtKind[]).map((k) => {
          const M = KIND_META[k];
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <M.icon className={cn('size-3.5', active && M.tone)} />
              {t(M.labelKey)}
            </button>
          );
        })}
      </div>

      <Field label={t('debts.counterparty')} htmlFor="debt-who">
        <PayeeCombobox
          id="debt-who"
          value={counterparty}
          onChange={setCounterparty}
          payees={payees}
          placeholder={t('debts.counterpartyPlaceholder')}
        />
      </Field>

      <Field label={t('debts.reason')} htmlFor="debt-name" hint={t('common.optional')}>
        <Input
          id="debt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('debts.reasonPlaceholder')}
        />
      </Field>

      <Field label={t('debts.amount')} htmlFor="debt-amount">
        <div className="flex gap-2">
          <AmountInput
            id="debt-amount"
            value={amount}
            onChange={setAmount}
            className="flex-1"
            currency={currency}
          />
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v ?? base)}
            items={Object.fromEntries(CURRENCIES.map((c) => [c.code, c.code]))}
          >
            <SelectTrigger className="w-[86px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="tnum">{c.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {currency !== base && Number(amount) > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('fx.approx')}{' '}
            <span className="font-medium text-foreground">
              {money(toBase(toCents(Number(amount)), currency))}
            </span>
            {rates[currency] && (
              <>
                {' · '}
                {t('fx.rateLine', {
                  q: currency,
                  v: formatMoney(Math.round(rates[currency] * 100), {
                    currency: base,
                    locale,
                  }),
                })}
              </>
            )}
          </p>
        )}
      </Field>

      <Field label={t('debts.linkedAccount')} hint={t('debts.linkedHint')}>
        <IconSelect
          options={accounts.map((a) => ({
            value: a.id,
            label: a.name,
            icon: a.icon,
            color: a.color,
          }))}
          value={accountId}
          onChange={(v) => setAccountId(v || NO_ACCOUNT)}
          none={{ value: NO_ACCOUNT, label: t('debts.noAccount') }}
          fallbackIcon="Wallet"
        />
      </Field>

      <Field label={t('debts.plan')} hint={t('debts.planHint')}>
        <InstallmentsEditor
          mode={planMode}
          onModeChange={setPlanMode}
          rows={rows}
          onRowsChange={setRows}
          targetCents={targetCents}
        />
      </Field>

      {canRecord && (
        <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3.5 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium">{t('debts.recordOpening')}</span>
            <span className="block text-xs text-muted-foreground">
              {kind === 'payable'
                ? t('debts.recordOpeningIn', { account: linkedAccount!.name })
                : t('debts.recordOpeningOut', { account: linkedAccount!.name })}
            </span>
          </span>
          <Switch checked={recordMovement} onCheckedChange={setRecordMovement} />
        </label>
      )}

      <Field label={t('common.notes')}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('debts.notesPlaceholder')}
          rows={2}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? (
            t('action.saving')
          ) : (
            <>
              <HandCoins className="size-4" />
              {isEdit ? t('action.saveChanges') : t('debts.add')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
