import Link from 'next/link';
import { Brand } from './brand';
import { SidebarNav } from './sidebar-nav';
import { AnimatedAmount, DeltaChip } from '@/components/shared/amount';
import { getT } from '@/lib/i18n/server';

export async function DesktopSidebar({
  netWorth,
  deltaPct,
}: {
  netWorth: number;
  deltaPct: number;
}) {
  const t = await getT();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center px-5">
        <Link href="/" aria-label="Ample home">
          <Brand />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2" data-tour="nav">
        <SidebarNav />
      </div>

      <div className="p-3">
        <div className="hairline-brass rounded-xl border border-border/70 bg-card/60 p-3.5">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('common.netWorth')}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <AnimatedAmount
              value={netWorth}
              compact
              decimals={false}
              className="font-display text-2xl font-medium"
            />
            <DeltaChip value={deltaPct} positiveIsGood showIcon />
          </div>
        </div>
      </div>
    </aside>
  );
}
