'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/components/providers/settings-provider';

export function PrivacyToggle() {
  const { hideAmounts, toggleHideAmounts, t } = useSettings();
  const label = hideAmounts ? t('privacy.show') : t('privacy.hide');
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon-sm" onClick={toggleHideAmounts} aria-label={label} />
        }
      >
        <HugeiconsIcon
          icon={hideAmounts ? ViewOffSlashIcon : ViewIcon}
          className="hg-icon size-4"
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
