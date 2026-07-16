"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@/components/shared/icon";

export interface IconSelectOption {
  value: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  /** nest visually under the previous option (e.g. sub-items) */
  indent?: boolean;
}

/**
 * Generic icon + label picker. Base UI's Select only renders the selected
 * label in the closed trigger when it's given an `items` map, so this builds
 * that map from the option list — the chosen option shows its icon AND name in
 * the control, not just in the dropdown. Used for accounts and any other
 * entity picker that carries an icon (mirrors CategorySelect's fix).
 */
export function IconSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
  className,
  fallbackIcon = "Circle",
  disabled = false,
  none,
}: {
  options: IconSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  fallbackIcon?: string;
  disabled?: boolean;
  /** optional "none" sentinel row, e.g. { value: "__none__", label: "None" } */
  none?: { value: string; label: string };
}) {
  const all = React.useMemo(
    () => (none ? [{ ...none, isNone: true }, ...options] : options),
    [none, options]
  );

  const items = React.useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const o of all) {
      const isNone = "isNone" in o && o.isNone;
      map[o.value] = isNone ? (
        <span className="text-muted-foreground">{o.label}</span>
      ) : (
        <OptionLabel option={o as IconSelectOption} fallbackIcon={fallbackIcon} />
      );
    }
    return map;
  }, [all, fallbackIcon]);

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v ?? "")}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full min-w-0", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => {
          const isNone = "isNone" in o && o.isNone;
          return (
            <SelectItem key={o.value} value={o.value}>
              {isNone ? (
                <span className="text-muted-foreground">{o.label}</span>
              ) : (
                <OptionLabel
                  option={o as IconSelectOption}
                  fallbackIcon={fallbackIcon}
                />
              )}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function OptionLabel({
  option,
  fallbackIcon,
}: {
  option: IconSelectOption;
  fallbackIcon: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.indent && (
        <span className="text-muted-foreground/60" aria-hidden>
          ↳
        </span>
      )}
      <Icon
        name={option.icon ?? fallbackIcon}
        className="size-3.5 shrink-0"
        style={{ color: option.color ?? undefined }}
      />
      <span className="truncate">{option.label}</span>
    </span>
  );
}
