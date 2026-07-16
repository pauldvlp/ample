"use client";

import { usePathname } from "next/navigation";
import { pageTourIdForPath } from "./page-tours";
import { PageTourButton } from "./page-tour-button";

/**
 * Route-aware help affordance for the topbar. Maps the current pathname to a
 * page tour and renders its launcher; renders nothing when the route has no tour.
 */
export function ContextHelpButton() {
  const pathname = usePathname();
  const pageId = pageTourIdForPath(pathname);
  if (!pageId) return null;
  return <PageTourButton pageId={pageId} />;
}
