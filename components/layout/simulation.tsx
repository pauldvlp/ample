'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { TestTube01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/components/providers/settings-provider';
import { formatDate } from '@/lib/format';
import { FastForward } from 'lucide-react';

/** Topbar button that enters simulation mode. Hidden while already simulating. */
export function SimulationToggle() {
  const { simulationActive, enterSim, simPending, t } = useSettings();
  if (simulationActive) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={simPending}
            aria-label={t('sim.enter')}
            onClick={async () => {
              await enterSim();
              toast.success(t('sim.startedToast'));
            }}
          />
        }
      >
        <HugeiconsIcon icon={TestTube01Icon} className="hg-icon size-4" />
      </TooltipTrigger>
      <TooltipContent>{t('sim.tooltip')}</TooltipContent>
    </Tooltip>
  );
}

const STEPS: { labelKey: string; days: number }[] = [
  { labelKey: 'sim.plusDay', days: 1 },
  { labelKey: 'sim.plusWeek', days: 7 },
  { labelKey: 'sim.plusMonth', days: 30 },
];

/** Prominent bar shown across the app while simulating, with a time-machine
 *  that fast-forwards the clock and auto-posts recurring bills as they fall due. */
export function SimulationBanner() {
  const { simulationActive, simDate, exitSim, advanceSim, simPending, t } = useSettings();
  // Fold projected budget spending into the time-machine so fast-forwarding
  // reflects real day-to-day spending, not just fixed bills. On by default.
  const [includeBudget, setIncludeBudget] = React.useState(true);
  if (!simulationActive) return null;

  async function advance(days: number) {
    const res = await advanceSim(days, includeBudget);
    if (res) {
      toast.success(
        res.posted > 0 ? t('sim.advancedPosted', { n: res.posted }) : t('sim.advanced'),
      );
    }
  }

  return (
    <div className="sticky top-14 z-20 border-b border-brass/30 bg-brass/12 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brass/20 text-brass">
          <HugeiconsIcon icon={TestTube01Icon} className="hg-icon size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {t('sim.active')}
            {simDate && (
              <span className="ml-2 font-normal text-muted-foreground">
                · {t('sim.simDate', { date: formatDate(simDate) })}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{t('sim.banner')}</p>
        </div>

        {/* budget-spend toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={includeBudget}
                  onCheckedChange={setIncludeBudget}
                  disabled={simPending}
                />
                <span className="hidden md:inline">{t('sim.budgetSpend')}</span>
              </label>
            }
          />
          <TooltipContent>{t('sim.budgetSpendHint')}</TooltipContent>
        </Tooltip>

        {/* time machine */}
        <div className="flex items-center gap-1">
          <FastForward className="mr-0.5 hidden size-3.5 text-brass sm:block" />
          {STEPS.map((s) => (
            <Button
              key={s.days}
              size="xs"
              variant="outline"
              disabled={simPending}
              className="border-brass/40"
              onClick={() => advance(s.days)}
            >
              {t(s.labelKey)}
            </Button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={simPending}
          className="shrink-0 border-brass/40"
          onClick={async () => {
            await exitSim();
            toast.success(t('sim.endedToast'));
          }}
        >
          {simPending ? t('sim.working') : t('sim.discard')}
        </Button>
      </div>
    </div>
  );
}
