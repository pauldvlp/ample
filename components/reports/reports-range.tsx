'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useT } from '@/components/providers/settings-provider';

export const RANGE_OPTIONS = [
  { value: '1m', labelKey: 'reports.range1m' },
  { value: '3m', labelKey: 'reports.range3m' },
  { value: '6m', labelKey: 'reports.range6m' },
  { value: '12m', labelKey: 'reports.range12m' },
  { value: 'ytd', labelKey: 'reports.rangeYtd' },
] as const;

export function ReportsRange({ current }: { current: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();

  function select(value: string) {
    if (value === current) return;
    startTransition(() => {
      router.push(`${pathname}?range=${value}`, { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      data-tour="reports-range"
      aria-label={t('reports.rangeLabel')}
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-muted/60 p-1 transition-opacity',
        pending && 'opacity-60',
      )}
    >
      {RANGE_OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(opt.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition-all',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
