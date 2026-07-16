"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/components/providers/settings-provider";
import { useIsClient } from "@/hooks/use-is-client";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const mounted = useIsClient();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={t("theme.toggle")}
          />
        }
      >
        <HugeiconsIcon
          icon={Sun01Icon}
          className="hg-icon size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
        />
        <HugeiconsIcon
          icon={Moon02Icon}
          className="hg-icon absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
        />
      </TooltipTrigger>
      <TooltipContent>{isDark ? t("theme.light") : t("theme.dark")}</TooltipContent>
    </Tooltip>
  );
}
