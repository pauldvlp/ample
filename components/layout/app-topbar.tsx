'use client';

import * as React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Brand, BrandMark } from './brand';
import { SidebarNav } from './sidebar-nav';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { PrivacyToggle } from '@/components/shared/privacy-toggle';
import { SimulationToggle } from './simulation';
import { AiAssistant } from '@/components/ai/ai-assistant';
import { ContextHelpButton } from '@/components/onboarding/context-help-button';
import { TransactionDialog } from '@/components/transactions/transaction-dialog';
import { useT } from '@/components/providers/settings-provider';
import type { AccountOption, CategoryOption, TagOption, PayeeOption } from '@/lib/types';

export function AppTopbar({
  accounts,
  categories,
  tags,
  payees,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  tags: TagOption[];
  payees?: PayeeOption[];
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* mobile menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Menu" />}
        >
          <HugeiconsIcon icon={Menu01Icon} className="hg-icon size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetTitle className="sr-only">{t('brand.tagline')}</SheetTitle>
          <div className="flex h-14 items-center px-5">
            <Brand />
          </div>
          <div className="px-3 py-2">
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </div>
          {/* Utility toggles that were decluttered out of the mobile topbar. */}
          <div className="mt-auto flex items-center gap-1 border-t border-border/70 p-3">
            <ThemeToggle />
            <SimulationToggle />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 lg:hidden">
        <BrandMark className="size-7" />
        <span className="font-display text-lg font-medium">Ample</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <TransactionDialog
          accounts={accounts}
          categories={categories}
          tags={tags}
          payees={payees}
          trigger={
            <Button size="sm" className="gap-1.5" data-tour="new-tx">
              <HugeiconsIcon icon={PlusSignIcon} className="hg-icon size-4" />
              <span className="hidden sm:inline">{t('action.new')}</span>
            </Button>
          }
        />
        <AiAssistant />
        <PrivacyToggle />
        {/* Secondary utilities live in the mobile menu; shown inline on desktop. */}
        <div className="mx-1 hidden h-5 w-px bg-border lg:block" />
        <div className="hidden items-center gap-1 lg:flex">
          <SimulationToggle />
          <ThemeToggle />
          <ContextHelpButton />
        </div>
      </div>
    </header>
  );
}
