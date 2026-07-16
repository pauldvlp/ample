"use client";

import { useT } from "@/components/providers/settings-provider";
import { PageTourButton } from "./page-tour-button";
import { PAGE_TOUR_IDS, PAGE_TOUR_NAV_KEY } from "./page-tours";

/**
 * Compact grid of per-page tutorial launchers, shown in Settings so any page's
 * walkthrough can be replayed on demand. Page names reuse the `nav.*` keys.
 */
export function PageTutorials() {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PAGE_TOUR_IDS.map((id) => (
        <PageTourButton key={id} pageId={id} label={t(PAGE_TOUR_NAV_KEY[id])} />
      ))}
    </div>
  );
}
