import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export function EmptyState({
  icon = "Sparkles",
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-14 text-center",
        className
      )}
    >
      <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon name={icon} className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
