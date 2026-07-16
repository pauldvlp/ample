"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/settings-provider";
import { START_TOUR_EVENT } from "./product-tour";
import { Compass } from "lucide-react";

/** Restarts the guided product tour from Settings. */
export function ReplayTourButton() {
  const t = useT();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}
    >
      <Compass className="size-4" />
      {t("tour.replay")}
    </Button>
  );
}
