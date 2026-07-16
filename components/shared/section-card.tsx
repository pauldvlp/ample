"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { useT } from "@/components/providers/settings-provider";

export function SectionCard({
  title,
  description,
  action,
  href,
  hrefLabel,
  children,
  className,
  contentClassName,
  noContentPadding = false,
  hairline = false,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noContentPadding?: boolean;
  hairline?: boolean;
}) {
  const t = useT();
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card",
        hairline && "hairline-brass",
        className
      )}
    >
      {(title || action || href) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <div className="min-w-0 space-y-0.5">
            {title && (
              <h2 className="font-display text-base font-medium leading-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action ??
            (href && (
              <Link
                href={href}
                className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {hrefLabel ?? t("action.viewAll")}
                <ArrowUpRight className="size-3.5" />
              </Link>
            ))}
        </header>
      )}
      <div
        className={cn(
          !noContentPadding && "px-5 pb-5 pt-3",
          "flex-1",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
