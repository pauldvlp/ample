'use client';

import * as React from 'react';
import { addMonths, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/shared/date-picker';
import { AmountInput } from '@/components/shared/form-fields';
import { useSettings } from '@/components/providers/settings-provider';
import { toDateInputValue, fromDateInputValue } from '@/lib/format';
import { fromCents, toCents } from '@/lib/money';
import { CalendarClock, Plus, Sparkles, X } from 'lucide-react';

export type PlanMode = 'none' | 'scheduled';

export interface InstallmentDraft {
  key: string;
  /** yyyy-mm-dd */
  date: string;
  /** base-currency major units, as typed */
  amount: string;
}

let seq = 0;
export function draftKey() {
  seq += 1;
  return `inst-${seq}`;
}

/** Build a draft row for the remaining unscheduled amount. */
export function remainderRow(rows: InstallmentDraft[], targetCents: number): InstallmentDraft {
  const scheduled = rows.reduce((s, r) => s + toCents(Number(r.amount) || 0), 0);
  const remaining = Math.max(0, targetCents - scheduled);
  return {
    key: draftKey(),
    date: '',
    amount: remaining > 0 ? String(fromCents(remaining)) : '',
  };
}

/**
 * Payment-plan editor for a debt: choose "no date" or a schedule of installments
 * (cuotas). A single-payment plan is just one row for the full amount; the split
 * helper generates N evenly-spaced rows. Fully controlled by the parent form.
 */
export function InstallmentsEditor({
  mode,
  onModeChange,
  rows,
  onRowsChange,
  /** total to schedule (base cents) — the debt's outstanding/principal */
  targetCents,
}: {
  mode: PlanMode;
  onModeChange: (m: PlanMode) => void;
  rows: InstallmentDraft[];
  onRowsChange: (rows: InstallmentDraft[]) => void;
  targetCents: number;
}) {
  const { t, money, currency: base } = useSettings();

  const [splitN, setSplitN] = React.useState('2');
  const [splitFreq, setSplitFreq] = React.useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [splitStart, setSplitStart] = React.useState('');

  const scheduledCents = rows.reduce((s, r) => s + toCents(Number(r.amount) || 0), 0);
  const diff = targetCents - scheduledCents;

  function setMode(m: PlanMode) {
    if (m === 'scheduled' && rows.length === 0) {
      // seed a single row for the full amount so a one-off payment is one step
      onRowsChange([remainderRow([], targetCents)]);
    }
    onModeChange(m);
  }

  function updateRow(key: string, patch: Partial<InstallmentDraft>) {
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    onRowsChange(rows.filter((r) => r.key !== key));
  }
  function addRow() {
    onRowsChange([...rows, remainderRow(rows, targetCents)]);
  }
  function generate() {
    const n = Math.max(1, Math.min(60, Math.round(Number(splitN) || 0)));
    const start = splitStart ? fromDateInputValue(splitStart) : new Date();
    const per = Math.floor(targetCents / n);
    const rem = targetCents - per * n;
    const next = Array.from({ length: n }, (_, i) => {
      const d =
        splitFreq === 'monthly'
          ? addMonths(start, i)
          : splitFreq === 'biweekly'
            ? addWeeks(start, 2 * i)
            : addWeeks(start, i);
      const cents = per + (i === n - 1 ? rem : 0);
      return {
        key: draftKey(),
        date: toDateInputValue(d),
        amount: String(fromCents(cents)),
      };
    });
    onRowsChange(next);
  }

  return (
    <div className="space-y-3">
      {/* mode toggle */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1">
        {(['none', 'scheduled'] as PlanMode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'scheduled' && <CalendarClock className="size-3.5" />}
              {m === 'none' ? t('debts.planNone') : t('debts.planInstallments')}
            </button>
          );
        })}
      </div>

      {mode === 'scheduled' && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
          {/* split helper */}
          <div className="flex flex-wrap items-end gap-2 text-xs text-muted-foreground">
            <span className="pb-2">{t('debts.splitLabel')}</span>
            <Input
              type="number"
              min={1}
              max={60}
              value={splitN}
              onChange={(e) => setSplitN(e.target.value)}
              className="h-9 w-16"
              aria-label={t('debts.splitLabel')}
            />
            <span className="pb-2">{t('debts.splitEvery')}</span>
            <Select
              value={splitFreq}
              onValueChange={(v) => setSplitFreq((v as typeof splitFreq) ?? 'monthly')}
              items={{
                monthly: t('debts.freqMonthly'),
                biweekly: t('debts.freqBiweekly'),
                weekly: t('debts.freqWeekly'),
              }}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t('debts.freqMonthly')}</SelectItem>
                <SelectItem value="biweekly">{t('debts.freqBiweekly')}</SelectItem>
                <SelectItem value="weekly">{t('debts.freqWeekly')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-[150px]">
              <DatePicker
                value={splitStart}
                onChange={setSplitStart}
                clearable
                placeholder={t('debts.installmentDate')}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={generate}>
              <Sparkles className="size-3.5" />
              {t('debts.splitGenerate')}
            </Button>
          </div>

          {/* rows */}
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs tnum text-muted-foreground">
                  {i + 1}
                </span>
                <div className="w-[150px] shrink-0">
                  <DatePicker
                    value={r.date}
                    onChange={(v) => updateRow(r.key, { date: v })}
                    placeholder={t('debts.installmentDate')}
                  />
                </div>
                <AmountInput
                  value={r.amount}
                  onChange={(v) => updateRow(r.key, { amount: v })}
                  currency={base}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(r.key)}
                  aria-label={t('debts.removeInstallment')}
                  className="shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="size-3.5" />
            {t('debts.addInstallment')}
          </Button>

          {/* summary */}
          <p className="text-xs text-muted-foreground">
            {t('debts.scheduledOf', {
              scheduled: money(scheduledCents),
              total: money(targetCents),
            })}
            {' · '}
            {diff > 0 ? (
              <span className="text-brass">{t('debts.unscheduled', { amount: money(diff) })}</span>
            ) : diff < 0 ? (
              <span className="text-negative">
                {t('debts.overScheduled', { amount: money(-diff) })}
              </span>
            ) : (
              <span className="text-positive">{t('debts.scheduleBalanced')}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
