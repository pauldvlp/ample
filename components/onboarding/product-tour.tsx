'use client';

import * as React from 'react';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useSettings } from '@/components/providers/settings-provider';
import { completeTour } from '@/lib/actions/ai-config';

/** Custom event other components can dispatch to (re)start the tour. */
export const START_TOUR_EVENT = 'ample:start-tour';

/**
 * Guided product tour (driver.js). Auto-runs once on first launch, and can be
 * replayed by dispatching `ample:start-tour`. Steps are localized and the AI step
 * nudges the user to enable the assistant when it's still off.
 */
export function ProductTour({ autoStart, aiEnabled }: { autoStart: boolean; aiEnabled: boolean }) {
  const { t } = useSettings();

  const start = React.useCallback(() => {
    // The AI entry point differs by breakpoint (a topbar icon on desktop, a
    // floating button on mobile) — both carry data-tour="assistant". Highlight
    // whichever is actually rendered so the step never anchors to a hidden node.
    const aiEls = Array.from(document.querySelectorAll<HTMLElement>('[data-tour="assistant"]'));
    const aiEl = aiEls.find((el) => el.getClientRects().length > 0) ?? aiEls[0];
    // The mobile FAB sits low on screen, so open its popover above it.
    const aiRect = aiEl?.getClientRects()[0];
    const aiSide = aiRect && aiRect.top > window.innerHeight / 2 ? 'top' : 'bottom';

    const steps: DriveStep[] = [
      {
        popover: {
          title: t('tour.welcomeTitle'),
          description: t('tour.welcomeBody'),
        },
      },
      {
        element: '[data-tour="nav"]',
        popover: {
          title: t('tour.navTitle'),
          description: t('tour.navBody'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="new-tx"]',
        popover: {
          title: t('tour.newTxTitle'),
          description: t('tour.newTxBody'),
          side: 'bottom',
        },
      },
      {
        element: aiEl,
        popover: {
          title: t('tour.assistantTitle'),
          description: aiEnabled ? t('tour.assistantBody') : t('tour.assistantBodyOff'),
          side: aiSide,
        },
      },
      {
        popover: {
          title: t('tour.doneTitle'),
          description: t('tour.doneBody'),
        },
      },
    ];

    const d = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: t('tour.next'),
      prevBtnText: t('tour.prev'),
      doneBtnText: t('tour.done'),
      popoverClass: 'ample-driver',
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.5,
      onDestroyed: () => {
        void completeTour();
      },
      steps,
    });
    d.drive();
  }, [t, aiEnabled]);

  // auto-run once on first launch
  React.useEffect(() => {
    if (!autoStart) return;
    const id = setTimeout(start, 900);
    return () => clearTimeout(id);
  }, [autoStart, start]);

  // allow replay from anywhere
  React.useEffect(() => {
    const handler = () => start();
    window.addEventListener(START_TOUR_EVENT, handler);
    return () => window.removeEventListener(START_TOUR_EVENT, handler);
  }, [start]);

  return null;
}
