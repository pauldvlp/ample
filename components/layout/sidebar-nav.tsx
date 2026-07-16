"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/settings-provider";
import { PRIMARY_NAV, SECONDARY_NAV, isActivePath, type NavItem } from "./nav-config";

function NavLink({
  item,
  active,
  label,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour={item.dataTour}
      className={cn(
        "group relative flex items-center gap-3 rounded-[0.7rem] px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brass" />
      )}
      <HugeiconsIcon
        icon={item.icon}
        className={cn(
          "hg-icon size-[1.15rem] shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
        strokeWidth={active ? 2 : 1.8}
      />
      {label}
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="flex flex-col gap-1">
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          label={t(item.labelKey)}
          active={isActivePath(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
      <div className="my-2 h-px bg-border/70" />
      {SECONDARY_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          label={t(item.labelKey)}
          active={isActivePath(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
