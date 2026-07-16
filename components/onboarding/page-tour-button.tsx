"use client";

import * as React from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { CircleHelp, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/settings-provider";
import { PAGE_TOURS, type PageTourId } from "./page-tours";

/**
 * Launches the guided tutorial for a given page. Reuses the exact driver.js
 * config as the welcome tour (`ample-driver` popover + localized buttons). Renders
 * as an unobtrusive icon button, or — when `label` is set — a labeled button
 * (used in the Settings tutorials list).
 */
export function PageTourButton({
  pageId,
  label,
  className,
}: {
  pageId: PageTourId;
  /** When provided, renders a labeled button instead of an icon-only one. */
  label?: string;
  className?: string;
}) {
  const t = useT();
  const ariaLabel = t("help.pageTour");

  const start = React.useCallback(() => {
    const steps: DriveStep[] = PAGE_TOURS[pageId].map((step) => ({
      element: step.element,
      popover: {
        title: t(step.titleKey),
        description: t(step.bodyKey),
        side: step.side,
        align: step.align,
      },
    }));

    const d = driver({
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      nextBtnText: t("tour.next"),
      prevBtnText: t("tour.prev"),
      doneBtnText: t("tour.done"),
      popoverClass: "ample-driver",
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.5,
      steps,
    });
    d.drive();
  }, [pageId, t]);

  if (label) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={start}
        className={cn("justify-start", className)}
      >
        <GraduationCap className="size-4 text-brass" />
        <span className="truncate">{label}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={start}
      className={className}
    >
      <CircleHelp className="size-5" />
    </Button>
  );
}
