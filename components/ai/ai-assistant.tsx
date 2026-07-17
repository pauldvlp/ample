'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { useT } from '@/components/providers/settings-provider';

/**
 * Mobile-only floating shortcut to the full-page AI assistant (`/assistant`).
 * Desktop reaches the assistant through the sidebar nav item, so this renders
 * nothing there. Portaled to <body> so the topbar's backdrop-filter doesn't
 * become the containing block for its fixed positioning. Kept mounted from the
 * topbar; carries `data-tour="assistant"` for the guided tour on mobile.
 */
export function AiAssistant() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // createPortal needs a DOM target; gate until after mount (no SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Already on the assistant page — no need for the shortcut.
  if (!mounted || pathname === '/assistant') return null;

  return createPortal(
    <button
      type="button"
      onClick={() => router.push('/assistant')}
      aria-label={t('assistant.title')}
      data-tour="assistant"
      className="fixed right-4 bottom-5 z-40 grid size-14 place-items-center rounded-full bg-brass text-brass-foreground shadow-lg shadow-brass/30 ring-1 ring-black/5 transition-transform active:scale-95 lg:hidden"
    >
      <HugeiconsIcon icon={SparklesIcon} className="hg-icon size-6" />
    </button>,
    document.body,
  );
}
