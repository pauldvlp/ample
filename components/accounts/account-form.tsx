'use client';

import * as React from 'react';
import { toast } from 'sonner';
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
import { Field, AmountInput, IconPicker, ColorPicker } from '@/components/shared/form-fields';
import { Icon } from '@/components/shared/icon';
import { useSettings } from '@/components/providers/settings-provider';
import { createAccount, updateAccount, type AccountInput } from '@/lib/actions/accounts';
import {
  ACCOUNT_TYPE_META,
  ACCOUNT_TYPE_ORDER,
  CATEGORY_PALETTE,
  CURRENCIES,
} from '@/lib/constants';
import { fromCents } from '@/lib/money';
import type { AccountType, Account } from '@/db/schema';

export function AccountForm({
  account,
  onDone,
}: {
  account?: Account | null;
  onDone?: () => void;
}) {
  const { t, currency: base } = useSettings();
  const isEdit = !!account;
  const initialType = (account?.type as AccountType) ?? 'checking';

  const [name, setName] = React.useState(account?.name ?? '');
  const [type, setType] = React.useState<AccountType>(initialType);
  const [institution, setInstitution] = React.useState(account?.institution ?? '');
  // New accounts default to the base currency; keep an edited account's own one.
  const [currency, setCurrency] = React.useState(account?.currency ?? base);
  const [startingBalance, setStartingBalance] = React.useState(
    account ? String(fromCents(account.startingBalance)) : '',
  );
  const [creditLimit, setCreditLimit] = React.useState(
    account?.creditLimit != null ? String(fromCents(account.creditLimit)) : '',
  );
  const [icon, setIcon] = React.useState<string>(
    account?.icon ?? ACCOUNT_TYPE_META[initialType].icon,
  );
  const [iconTouched, setIconTouched] = React.useState(!!account?.icon);
  const [color, setColor] = React.useState<string>(account?.color ?? CATEGORY_PALETTE[0]);
  const [includeInNetWorth, setIncludeInNetWorth] = React.useState(
    account?.includeInNetWorth ?? true,
  );
  const [notes, setNotes] = React.useState(account?.notes ?? '');
  const [pending, setPending] = React.useState(false);

  // Keep the icon in sync with the account type until the user picks their
  // own — done during render (tracking the previous type) rather than in an
  // effect, so there's no render where the icon still shows the old type.
  const [prevType, setPrevType] = React.useState(type);
  if (type !== prevType) {
    setPrevType(type);
    if (!iconTouched) setIcon(ACCOUNT_TYPE_META[type].icon);
  }

  const isCredit = type === 'credit';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('accounts.errName'));
      return;
    }
    const startNum = Number(startingBalance || '0');
    if (Number.isNaN(startNum)) {
      toast.error(t('accounts.errStartingBalance'));
      return;
    }
    const limitNum = creditLimit.trim() === '' ? null : Number(creditLimit);
    if (isCredit && limitNum != null && Number.isNaN(limitNum)) {
      toast.error(t('accounts.errCreditLimit'));
      return;
    }

    const input: AccountInput = {
      name: name.trim(),
      type,
      institution: institution.trim() || null,
      currency,
      startingBalance: startNum,
      creditLimit: isCredit ? limitNum : null,
      icon: icon || null,
      color: color || null,
      notes: notes.trim() || null,
      includeInNetWorth,
    };

    setPending(true);
    const res = isEdit ? await updateAccount(account!.id, input) : await createAccount(input);
    setPending(false);

    if (res.ok) {
      toast.success(isEdit ? t('accounts.toastUpdated') : t('accounts.toastAdded'));
      onDone?.();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('accounts.fieldName')} htmlFor="acct-name">
        <Input
          id="acct-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('accounts.namePlaceholder')}
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('accounts.fieldType')}>
          <Select
            value={type}
            onValueChange={(v) => setType((v as AccountType) || 'checking')}
            items={Object.fromEntries(
              ACCOUNT_TYPE_ORDER.map((ty) => [ty, t(`accounts.type.${ty}`)]),
            )}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('accounts.typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPE_ORDER.map((ty) => (
                <SelectItem key={ty} value={ty}>
                  <Icon name={ACCOUNT_TYPE_META[ty].icon} className="size-3.5" />
                  <span>{t(`accounts.type.${ty}`)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('accounts.fieldCurrency')}>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v ?? 'USD')}
            items={Object.fromEntries(CURRENCIES.map((c) => [c.code, `${c.code} · ${c.label}`]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('accounts.currencyPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="tnum text-muted-foreground">{c.symbol}</span>
                  <span>
                    {c.code} · {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label={t('accounts.fieldInstitution')} htmlFor="acct-inst">
        <Input
          id="acct-inst"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder={t('accounts.institutionPlaceholder')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('accounts.fieldStartingBalance')}
          htmlFor="acct-start"
          hint={t('accounts.startingBalanceHint')}
        >
          <Input
            id="acct-start"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            placeholder="0.00"
            className="font-ledger tnum"
          />
        </Field>
        {isCredit && (
          <Field label={t('accounts.fieldCreditLimit')} hint={t('accounts.creditLimitHint')}>
            <AmountInput value={creditLimit} onChange={setCreditLimit} />
          </Field>
        )}
      </div>

      <Field label={t('accounts.fieldIconColor')}>
        <div className="flex items-center gap-3">
          <IconPicker
            value={icon}
            onChange={(i) => {
              setIcon(i);
              setIconTouched(true);
            }}
            color={color}
          />
          <ColorPicker value={color} onChange={setColor} className="flex-1" />
        </div>
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-3 py-2.5">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">{t('accounts.includeInNetWorth')}</p>
          <p className="text-xs text-muted-foreground">{t('accounts.includeInNetWorthDesc')}</p>
        </div>
        <Switch checked={includeInNetWorth} onCheckedChange={setIncludeInNetWorth} />
      </div>

      <Field label={t('common.notes')}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('accounts.notesPlaceholder')}
          rows={2}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? t('action.saving') : isEdit ? t('action.saveChanges') : t('accounts.add')}
        </Button>
      </div>
    </form>
  );
}
