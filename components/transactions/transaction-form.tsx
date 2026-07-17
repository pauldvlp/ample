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
import { Field, AmountInput } from '@/components/shared/form-fields';
import { CategorySelect } from '@/components/shared/category-select';
import { IconSelect } from '@/components/shared/icon-select';
import { PayeeCombobox } from '@/components/shared/payee-combobox';
import { DatePicker } from '@/components/shared/date-picker';
import { useSettings } from '@/components/providers/settings-provider';
import {
  createTransaction,
  updateTransaction,
  type TransactionInput,
} from '@/lib/actions/transactions';
import { createTag } from '@/lib/actions/tags';
import { toDateInputValue, fromDateInputValue } from '@/lib/format';
import { fromCents, toCents, formatMoney } from '@/lib/money';
import { CURRENCIES } from '@/lib/constants';
import type { AccountOption, CategoryOption, TagOption, PayeeOption } from '@/lib/types';
import type { CategoryKind } from '@/db/schema';
import type { TransactionEnriched } from '@/lib/data/transactions';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus } from 'lucide-react';

type TxType = 'expense' | 'income' | 'transfer';

const TYPE_META: Record<TxType, { icon: React.ElementType; tone: string }> = {
  expense: { icon: ArrowUpRight, tone: 'text-negative' },
  income: { icon: ArrowDownLeft, tone: 'text-positive' },
  transfer: { icon: ArrowLeftRight, tone: 'text-brass' },
};

export function TransactionForm({
  accounts,
  categories,
  tags: initialTags,
  payees = [],
  transaction,
  onDone,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  tags: TagOption[];
  payees?: PayeeOption[];
  transaction?: TransactionEnriched | null;
  onDone?: () => void;
}) {
  const { t, currency: base, locale, rates, money, toBase } = useSettings();
  const isEdit = !!transaction;
  const isInLeg = !!transaction && transaction.amount > 0 && !!transaction.transferGroupId;

  const [type, setType] = React.useState<TxType>((transaction?.type as TxType) ?? 'expense');
  // Foreign-priced transactions edit in their original currency (e.g. USD).
  const [currency, setCurrency] = React.useState(transaction?.originalCurrency ?? base);
  const [amount, setAmount] = React.useState(
    transaction
      ? String(Math.abs(fromCents(transaction.originalAmount ?? transaction.amount)))
      : '',
  );
  const [accountId, setAccountId] = React.useState(
    transaction
      ? isInLeg
        ? (transaction.transferAccountId ?? transaction.accountId)
        : transaction.accountId
      : (accounts[0]?.id ?? ''),
  );
  const [transferAccountId, setTransferAccountId] = React.useState(
    transaction ? (isInLeg ? transaction.accountId : (transaction.transferAccountId ?? '')) : '',
  );
  const [categoryId, setCategoryId] = React.useState(transaction?.categoryId ?? '');
  const [date, setDate] = React.useState(toDateInputValue(transaction?.date ?? new Date()));
  const [payee, setPayee] = React.useState(transaction?.payee ?? '');
  const [notes, setNotes] = React.useState(transaction?.notes ?? '');
  const [tags, setTags] = React.useState<TagOption[]>(initialTags);
  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(
    new Set(transaction?.tags.map((t) => t.id) ?? []),
  );
  const [newTag, setNewTag] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const catOptions = categories.filter((c) => c.kind === type);

  // clear category when it no longer matches the chosen type — during render
  // (tracking the previous type) rather than in an effect.
  const [prevType, setPrevType] = React.useState(type);
  if (type !== prevType) {
    setPrevType(type);
    if (type !== 'transfer' && categoryId && !catOptions.some((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addNewTag() {
    const name = newTag.trim().toLowerCase();
    if (!name) return;
    const existing = tags.find((t) => t.name === name);
    if (existing) {
      toggleTag(existing.id);
      setNewTag('');
      return;
    }
    const res = await createTag(name);
    if (res.ok && res.data) {
      const t = { id: res.data.id, name, color: null };
      setTags((prev) => [...prev, t]);
      setSelectedTags((prev) => new Set(prev).add(t.id));
      setNewTag('');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(t('transactions.errAmount'));
      return;
    }
    if (!accountId) {
      toast.error(t('transactions.errAccount'));
      return;
    }
    if (type === 'transfer' && (!transferAccountId || transferAccountId === accountId)) {
      toast.error(t('transactions.errDestination'));
      return;
    }

    const input: TransactionInput = {
      accountId,
      type,
      amount: amt,
      currency: type === 'transfer' ? base : currency,
      date: fromDateInputValue(date).getTime(),
      payee: payee.trim() || null,
      categoryId: type === 'transfer' ? null : categoryId || null,
      notes: notes.trim() || null,
      status: 'cleared',
      transferAccountId: type === 'transfer' ? transferAccountId : null,
      tagIds: type === 'transfer' ? [] : [...selectedTags],
    };

    setPending(true);
    const res = isEdit
      ? await updateTransaction(transaction!.id, input)
      : await createTransaction(input);
    setPending(false);

    if (res.ok) {
      toast.success(isEdit ? t('transactions.toastUpdated') : t('transactions.toastAdded'));
      onDone?.();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* type segmented control */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1">
        {(Object.keys(TYPE_META) as TxType[]).map((tt) => {
          const M = TYPE_META[tt];
          const active = type === tt;
          return (
            <button
              key={tt}
              type="button"
              onClick={() => setType(tt)}
              className={cn(
                'flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-xs font-medium transition-all sm:px-2 sm:text-sm',
                active
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <M.icon className={cn('size-3.5 shrink-0 max-sm:hidden', active && M.tone)} />
              <span className="truncate">{t(`common.${tt}`)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.amount')} htmlFor="tx-amount">
          <div className="flex gap-2">
            <AmountInput
              id="tx-amount"
              value={amount}
              onChange={setAmount}
              autoFocus
              className="flex-1"
              currency={type === 'transfer' ? base : currency}
            />
            {type !== 'transfer' && (
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
            )}
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
        <Field label={t('common.date')} htmlFor="tx-date">
          <DatePicker id="tx-date" value={date} onChange={setDate} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={type === 'transfer' ? t('transactions.fromAccountLabel') : t('common.account')}
        >
          <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
        </Field>
        {type === 'transfer' ? (
          <Field label={t('transactions.toAccountLabel')}>
            <AccountSelect
              accounts={accounts.filter((a) => a.id !== accountId)}
              value={transferAccountId}
              onChange={setTransferAccountId}
              placeholder={t('transactions.destination')}
            />
          </Field>
        ) : (
          <Field label={t('common.category')}>
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              kind={type as CategoryKind}
            />
          </Field>
        )}
      </div>

      <Field
        label={type === 'transfer' ? t('transactions.descriptionLabel') : t('transactions.payee')}
      >
        {type === 'transfer' ? (
          <Input
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder={t('transactions.payeePlaceholderTransfer')}
          />
        ) : (
          <PayeeCombobox
            value={payee}
            onChange={setPayee}
            payees={payees}
            kind={type}
            placeholder={
              type === 'income'
                ? t('transactions.payeePlaceholderIncome')
                : t('transactions.payeePlaceholderExpense')
            }
          />
        )}
      </Field>

      {type !== 'transfer' && (
        <Field label={t('transactions.tags')}>
          <div className="space-y-2">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const on = selectedTags.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs transition-colors',
                        on
                          ? 'border-primary/40 bg-primary/12 text-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/30',
                      )}
                    >
                      #{t.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void addNewTag();
                  }
                }}
                placeholder={t('transactions.addTagPlaceholder')}
                className="h-8"
              />
              <Button type="button" variant="outline" size="icon-sm" onClick={addNewTag}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </Field>
      )}

      <Field label={t('common.notes')}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('transactions.notesPlaceholder')}
          rows={2}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? t('action.saving') : isEdit ? t('action.saveChanges') : t('transactions.add')}
        </Button>
      </div>
    </form>
  );
}

function AccountSelect({
  accounts,
  value,
  onChange,
  placeholder,
}: {
  accounts: AccountOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useSettings();
  return (
    <IconSelect
      options={accounts.map((a) => ({
        value: a.id,
        label: a.name,
        icon: a.icon,
        color: a.color,
      }))}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? t('transactions.selectAccount')}
      fallbackIcon="Wallet"
    />
  );
}
