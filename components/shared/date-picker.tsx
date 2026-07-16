"use client";

import * as React from "react";
import { es as dfEs, enUS as dfEn } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "@/components/providers/settings-provider";
import { formatDate, toDateInputValue, fromDateInputValue } from "@/lib/format";

/**
 * Date picker with the same string contract as the native `<input type=date>`
 * it replaces: `value` / `onChange` are `yyyy-MM-dd` (empty string = no date),
 * so forms keep submitting `fromDateInputValue(value).getTime()` unchanged.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder,
  clearable = false,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { t, language, firstDayOfWeek } = useSettings();
  const [open, setOpen] = React.useState(false);
  const selected = value ? fromDateInputValue(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left">
          {selected ? formatDate(selected, "PP") : placeholder ?? t("date.pick")}
        </span>
        {clearable && selected && (
          <span
            aria-hidden
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onChange("");
            }}
          >
            <X className="size-3.5" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          weekStartsOn={firstDayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6}
          locale={language === "es" ? dfEs : dfEn}
          onSelect={(d) => {
            if (d) {
              onChange(toDateInputValue(d));
              setOpen(false);
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
