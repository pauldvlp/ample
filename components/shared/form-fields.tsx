"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icon } from "./icon";
import { CATEGORY_PALETTE, ICON_OPTIONS } from "@/lib/constants";
import { useSettings } from "@/components/providers/settings-provider";
import { currencySymbol } from "@/lib/money";
import { Check } from "lucide-react";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0.00",
  id,
  className,
  autoFocus,
  currency: currencyProp,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  /** override the prefix symbol's currency (defaults to the base currency) */
  currency?: string;
}) {
  const { currency: base } = useSettings();
  const symbol = currencySymbol(currencyProp ?? base);
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {symbol}
      </span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-7 font-ledger tnum"
      />
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string | null | undefined;
  onChange: (color: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {CATEGORY_PALETTE.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "grid size-7 place-items-center rounded-full transition-transform hover:scale-110",
              active && "ring-2 ring-offset-2 ring-offset-background"
            )}
            style={{ backgroundColor: c, ...(active ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
            aria-label={`Color ${c}`}
          >
            {active && <Check className="size-3.5 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: string | null | undefined;
  onChange: (icon: string) => void;
  color?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="icon" aria-label="Pick icon" />
        }
      >
        <Icon name={value} className="size-4" style={{ color: color ?? undefined }} />
      </PopoverTrigger>
      <PopoverContent className="w-[272px]">
        <div className="grid max-h-60 grid-cols-6 gap-1 overflow-y-auto overflow-x-hidden p-0.5">
          {ICON_OPTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                value === name && "bg-primary/12 text-primary"
              )}
              aria-label={name}
            >
              <Icon name={name} className="size-[1.15rem]" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
