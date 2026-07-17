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
import { CategorySelect } from '@/components/shared/category-select';
import { PayeeCombobox } from '@/components/shared/payee-combobox';
import { DatePicker } from '@/components/shared/date-picker';
import { useSettings } from '@/components/providers/settings-provider';
import { createRecurring, updateRecurring, type RecurringInput } from '@/lib/actions/recurring';
import { toDateInputValue, fromDateInputValue } from '@/lib/format';
import { fromCents, toCents, formatMoney } from '@/lib/money';
import { CURRENCIES } from '@/lib/constants';
import { FREQUENCIES, type Frequency, type CategoryKind } from '@/db/schema';
import type { AccountOption, CategoryOption, PayeeOption } from '@/lib/types';
import type { RecurringWithRefs } from '@/lib/data/recurring';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

type RecType = 'income' | 'expense';

const TYPE_META: Record<RecType, { labelKey: string; icon: React.ElementType; tone: string }> = {
  expense: { labelKey: 'common.expense', icon: ArrowUpRight, tone: 'text-negative' },
  income: { labelKey: 'common.income', icon: ArrowDownLeft, tone: 'text-positive' },
};

export function RecurringForm({
  accounts,
  categories,
  payees = [],
  rule,
  onDone,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  payees?: PayeeOption[];
  rule?: RecurringWithRefs | null;
  onDone?: () => void;
}) {
  const { t, currency: base, locale, rates, money, toBase } = useSettings();
  const isEdit = !!rule;

  const [name, setName] = React.useState(rule?.name ?? '');
  const [type, setType] = React.useState<RecType>((rule?.type as RecType) ?? 'expense');
  const [currency, setCurrency] = React.useState(rule?.originalCurrency ?? base);
  const [amount, setAmount] = React.useState(
    rule ? String(Math.abs(fromCents(rule.originalAmount ?? rule.amount))) : '',
  );
  const [accountId, setAccountId] = React.useState(rule?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = React.useState(rule?.categoryId ?? '');
  const [frequency, setFrequency] = React.useState<Frequency>(
    (rule?.frequency as Frequency) ?? 'monthly',
  );
  const [interval, setInterval] = React.useState(String(rule?.interval ?? 1));
  const [nextDueDate, setNextDueDate] = React.useState(
    toDateInputValue(rule?.nextDueDate ?? new Date()),
  );
  const [isSubscription, setIsSubscription] = React.useState(rule?.isSubscription ?? false);
  const [autoPost, setAutoPost] = React.useState(rule?.autoPost ?? false);
  const [payee, setPayee] = React.useState(rule?.payee ?? '');
  const [notes, setNotes] = React.useState(rule?.notes ?? '');
  const [pending, setPending] = React.useState(false);

  const catOptions = categories.filter((c) => c.kind === type);

  // if the chosen category stops being valid (type change), drop it — during
  // render (tracking the previous type) rather than in an effect.
  const [prevType, setPrevType] = React.useState(type);
  if (type !== prevType) {
    setPrevType(type);
    if (categoryId && !catOptions.some((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('recurring.errName'));
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(t('recurring.errAmount'));
      return;
    }
    if (!accountId) {
      toast.error(t('recurring.errAccount'));
      return;
    }
    const iv = Number(interval);

    const input: RecurringInput = {
      name: name.trim(),
      accountId,
      categoryId: categoryId || null,
      type,
      amount: amt,
      currency,
      payee: payee.trim() || null,
      frequency,
      interval: Number.isFinite(iv) && iv >= 1 ? Math.floor(iv) : 1,
      nextDueDate: fromDateInputValue(nextDueDate).getTime(),
      isSubscription,
      autoPost,
      notes: notes.trim() || null,
    };

    setPending(true);
    const res = isEdit ? await updateRecurring(rule!.id, input) : await createRecurring(input);
    setPending(false);

    if (res.ok) {
      toast.success(isEdit ? t('recurring.updatedToast') : t('recurring.addedToast'));
      onDone?.();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* type segmented control */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1">
        {(Object.keys(TYPE_META) as RecType[]).map((rt) => {
          const M = TYPE_META[rt];
          const active = type === rt;
          return (
            <button
              key={rt}
              type="button"
              onClick={() => setType(rt)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all',
                active
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <M.icon className={cn('size-3.5', active && M.tone)} />
              {t(M.labelKey)}
            </button>
          );
        })}
      </div>

      <Field label={t('recurring.name')} htmlFor="rec-name">
        <Input
          id="rec-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            type === 'income'
              ? t('recurring.namePlaceholderIncome')
              : t('recurring.namePlaceholderExpense')
          }
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.amount')} htmlFor="rec-amount">
          <div className="flex gap-2">
            <AmountInput
              id="rec-amount"
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
              {rates[currency] ? (
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
              ) : (
                <> · {t('fx.noRate')}</>
              )}
            </p>
          )}
        </Field>
        <Field label={t('recurring.nextDueDate')} htmlFor="rec-date">
          <DatePicker id="rec-date" value={nextDueDate} onChange={setNextDueDate} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.account')}>
          <IconSelect
            options={accounts.map((a) => ({
              value: a.id,
              label: a.name,
              icon: a.icon,
              color: a.color,
            }))}
            value={accountId}
            onChange={setAccountId}
            placeholder={t('recurring.selectAccount')}
            fallbackIcon="Wallet"
          />
        </Field>
        <Field label={t('common.category')}>
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            kind={type as CategoryKind}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('recurring.frequency')}>
          <Select
            value={frequency}
            onValueChange={(v) => setFrequency((v ?? 'monthly') as Frequency)}
            items={Object.fromEntries(FREQUENCIES.map((f) => [f, t(`recurring.freq.${f}`)]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('recurring.frequency')} />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {t(`recurring.freq.${f}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('recurring.every')} hint={t('recurring.everyHint')}>
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="tnum"
          />
        </Field>
      </div>

      <Field label={t('recurring.payee')}>
        <PayeeCombobox
          value={payee}
          onChange={setPayee}
          payees={payees}
          kind={type}
          placeholder={
            type === 'income'
              ? t('recurring.payeePlaceholderIncome')
              : t('recurring.payeePlaceholderExpense')
          }
        />
      </Field>

      <div className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {t('recurring.subscription')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('recurring.subscriptionDesc')}
            </span>
          </span>
          <Switch checked={isSubscription} onCheckedChange={setIsSubscription} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {t('recurring.autoPost')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('recurring.autoPostDesc')}
            </span>
          </span>
          <Switch checked={autoPost} onCheckedChange={setAutoPost} />
        </label>
      </div>

      <Field label={t('common.notes')}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('recurring.notesPlaceholder')}
          rows={2}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? t('action.saving') : isEdit ? t('action.saveChanges') : t('recurring.add')}
        </Button>
      </div>
    </form>
  );
}
