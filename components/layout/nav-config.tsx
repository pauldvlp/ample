import {
  DashboardSquare01Icon,
  Wallet01Icon,
  ArrowDataTransferHorizontalIcon,
  PieChartIcon,
  Target01Icon,
  RepeatIcon,
  Analytics01Icon,
  Agreement01Icon,
  GridIcon,
  Settings02Icon,
  AiChat01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: IconSvgElement;
  /** optional data-tour anchor id (for the guided product tour) */
  dataTour?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: DashboardSquare01Icon },
  {
    href: "/assistant",
    labelKey: "nav.assistant",
    icon: AiChat01Icon,
    dataTour: "assistant",
  },
  { href: "/accounts", labelKey: "nav.accounts", icon: Wallet01Icon },
  { href: "/transactions", labelKey: "nav.transactions", icon: ArrowDataTransferHorizontalIcon },
  { href: "/budgets", labelKey: "nav.budgets", icon: PieChartIcon },
  { href: "/goals", labelKey: "nav.goals", icon: Target01Icon },
  { href: "/recurring", labelKey: "nav.recurring", icon: RepeatIcon },
  { href: "/debts", labelKey: "nav.debts", icon: Agreement01Icon },
  { href: "/reports", labelKey: "nav.reports", icon: Analytics01Icon },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/categories", labelKey: "nav.categories", icon: GridIcon },
  { href: "/settings", labelKey: "nav.settings", icon: Settings02Icon },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
