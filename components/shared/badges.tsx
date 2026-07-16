import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

/** A small tinted disc holding a category/account icon. */
export function IconDisc({
  icon,
  color,
  className,
  size = "md",
}: {
  icon: string | null | undefined;
  color?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9";
  const iconSize = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  const c = color ?? "var(--muted-foreground)";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-[0.7rem]",
        dims,
        className
      )}
      style={{
        backgroundColor: `color-mix(in oklch, ${c} 16%, transparent)`,
        color: c,
      }}
    >
      <Icon name={icon} className={iconSize} />
    </span>
  );
}

export function ColorDot({
  color,
  className,
}: {
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
    />
  );
}

export function CategoryChip({
  name,
  color,
  icon,
  className,
}: {
  name: string;
  color?: string | null;
  icon?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: `color-mix(in oklch, ${color ?? "var(--muted-foreground)"} 14%, transparent)`,
        color: color ?? "var(--foreground)",
      }}
    >
      {icon && <Icon name={icon} className="size-3" />}
      {name}
    </span>
  );
}
