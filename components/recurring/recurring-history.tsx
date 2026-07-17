'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Undo2 } from 'lucide-react';
import { Amount } from '@/components/shared/amount';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { useSettings } from '@/components/providers/settings-provider';
import { formatDate } from '@/lib/format';
import {
  getRecurringPostings,
  revertRecurringPosting,
  type RecurringPosting,
} from '@/lib/actions/recurring';

/** History of transactions a recurring rule has generated, each revertable. */
export function RecurringHistory({ ruleId }: { ruleId: string }) {
  const { t, foreign, currency: base } = useSettings();
  const [items, setItems] = React.useState<RecurringPosting[] | null>(null);
  const [reverting, setReverting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await getRecurringPostings(ruleId);
    if (res.ok) setItems(res.data ?? []);
    else {
      setItems([]);
      toast.error(res.error);
    }
  }, [ruleId]);

  React.useEffect(() => {
    // Genuine data fetch (syncing with the server), not derived state — the
    // "track previous value, setState during render" rewrite used elsewhere
    // in this codebase doesn't apply to actual async I/O.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function revert(id: string) {
    setReverting(id);
    const res = await revertRecurringPosting(id);
    setReverting(null);
    if (res.ok) {
      toast.success(t('recurring.revertedToast'));
      await load();
    } else {
      toast.error(res.error);
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t('action.working')}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="Repeat"
        title={t('recurring.historyEmptyTitle')}
        description={t('recurring.historyEmptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t('recurring.historyDesc')}</p>
      <ul className="-mx-1 max-h-[52vh] divide-y divide-border/60 overflow-y-auto overscroll-contain">
        {items.map((p) => {
          const hasOriginal =
            p.originalAmount != null && !!p.originalCurrency && p.originalCurrency !== base;
          return (
            <li key={p.id} className="flex items-center gap-3 px-1 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {formatDate(new Date(p.date))}
                </p>
                {hasOriginal && (
                  <p className="sensitive tnum text-[0.65rem] text-muted-foreground">
                    {foreign(Math.abs(p.originalAmount!), p.originalCurrency!)}
                  </p>
                )}
              </div>
              <Amount value={p.amount} colored showSign className="shrink-0 text-sm font-medium" />
              <ConfirmDialog
                title={t('recurring.revertTitle')}
                description={t('recurring.revertDesc')}
                confirmLabel={t('recurring.revert')}
                onConfirm={() => revert(p.id)}
                trigger={
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={reverting === p.id}
                    aria-label={t('recurring.revertAria')}
                    className="shrink-0 gap-1"
                  >
                    <Undo2 className="size-3.5" />
                    <span className="hidden sm:inline">{t('recurring.revert')}</span>
                  </Button>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
