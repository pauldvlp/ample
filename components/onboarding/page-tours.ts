/**
 * Per-page guided-tutorial registry (client-safe — no server imports).
 *
 * Maps each app route to an ordered list of driver.js steps. A step highlights
 * an element by CSS selector (a `[data-tour="…"]` hook) or, when `element` is
 * omitted, shows a centered popover. Titles/bodies are i18n keys resolved at
 * runtime by `PageTourButton`. Keep tours short (3–6 steps) and focused.
 */

export type PageTourId =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "categories"
  | "budgets"
  | "goals"
  | "recurring"
  | "debts"
  | "reports"
  | "settings";

/** Matches driver.js `Side` so it maps straight onto a popover. */
export type PageTourSide = "top" | "right" | "bottom" | "left";

export interface PageTourStep {
  /** CSS selector for the element to spotlight; omit for a centered popover. */
  element?: string;
  /** i18n key for the popover title. */
  titleKey: string;
  /** i18n key for the popover body. */
  bodyKey: string;
  side?: PageTourSide;
  align?: "start" | "center" | "end";
}

/** Ordered list of all pages that have a tutorial (drives the Settings list). */
export const PAGE_TOUR_IDS: PageTourId[] = [
  "dashboard",
  "accounts",
  "transactions",
  "categories",
  "budgets",
  "goals",
  "recurring",
  "debts",
  "reports",
  "settings",
];

/** `nav.*` i18n key for each page id, reused to label the tutorial launchers. */
export const PAGE_TOUR_NAV_KEY: Record<PageTourId, string> = {
  dashboard: "nav.dashboard",
  accounts: "nav.accounts",
  transactions: "nav.transactions",
  categories: "nav.categories",
  budgets: "nav.budgets",
  goals: "nav.goals",
  recurring: "nav.recurring",
  debts: "nav.debts",
  reports: "nav.reports",
  settings: "nav.settings",
};

export const PAGE_TOURS: Record<PageTourId, PageTourStep[]> = {
  dashboard: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.dashboard.s1.title",
      bodyKey: "help.dashboard.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="dashboard-kpis"]',
      titleKey: "help.dashboard.s2.title",
      bodyKey: "help.dashboard.s2.body",
      side: "bottom",
    },
    {
      element: '[data-tour="dashboard-networth"]',
      titleKey: "help.dashboard.s3.title",
      bodyKey: "help.dashboard.s3.body",
      side: "right",
    },
    {
      titleKey: "help.dashboard.s4.title",
      bodyKey: "help.dashboard.s4.body",
    },
  ],
  accounts: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.accounts.s1.title",
      bodyKey: "help.accounts.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="accounts-networth"]',
      titleKey: "help.accounts.s2.title",
      bodyKey: "help.accounts.s2.body",
      side: "bottom",
    },
    {
      element: '[data-tour="accounts-add"]',
      titleKey: "help.accounts.s3.title",
      bodyKey: "help.accounts.s3.body",
      side: "bottom",
      align: "end",
    },
  ],
  transactions: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.transactions.s1.title",
      bodyKey: "help.transactions.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="transactions-add"]',
      titleKey: "help.transactions.s2.title",
      bodyKey: "help.transactions.s2.body",
      side: "bottom",
      align: "end",
    },
    {
      element: '[data-tour="transactions-filters"]',
      titleKey: "help.transactions.s3.title",
      bodyKey: "help.transactions.s3.body",
      side: "bottom",
    },
  ],
  categories: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.categories.s1.title",
      bodyKey: "help.categories.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="categories-add"]',
      titleKey: "help.categories.s2.title",
      bodyKey: "help.categories.s2.body",
      side: "bottom",
      align: "end",
    },
    {
      element: '[data-tour="categories-groups"]',
      titleKey: "help.categories.s3.title",
      bodyKey: "help.categories.s3.body",
      side: "top",
    },
  ],
  budgets: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.budgets.s1.title",
      bodyKey: "help.budgets.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="budgets-toolbar"]',
      titleKey: "help.budgets.s2.title",
      bodyKey: "help.budgets.s2.body",
      side: "bottom",
    },
    {
      element: '[data-tour="budgets-meter"]',
      titleKey: "help.budgets.s3.title",
      bodyKey: "help.budgets.s3.body",
      side: "top",
    },
  ],
  goals: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.goals.s1.title",
      bodyKey: "help.goals.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="goals-summary"]',
      titleKey: "help.goals.s2.title",
      bodyKey: "help.goals.s2.body",
      side: "bottom",
    },
    {
      element: '[data-tour="goals-add"]',
      titleKey: "help.goals.s3.title",
      bodyKey: "help.goals.s3.body",
      side: "bottom",
      align: "end",
    },
  ],
  recurring: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.recurring.s1.title",
      bodyKey: "help.recurring.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="recurring-kpis"]',
      titleKey: "help.recurring.s2.title",
      bodyKey: "help.recurring.s2.body",
      side: "bottom",
    },
    {
      element: '[data-tour="recurring-add"]',
      titleKey: "help.recurring.s3.title",
      bodyKey: "help.recurring.s3.body",
      side: "bottom",
      align: "end",
    },
  ],
  debts: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.debts.s1.title",
      bodyKey: "help.debts.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="debts-summary"]',
      titleKey: "help.debts.s2.title",
      bodyKey: "help.debts.s2.body",
      side: "bottom",
    },
    {
      element: '[data-tour="debts-add"]',
      titleKey: "help.debts.s3.title",
      bodyKey: "help.debts.s3.body",
      side: "bottom",
      align: "end",
    },
  ],
  reports: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.reports.s1.title",
      bodyKey: "help.reports.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="reports-range"]',
      titleKey: "help.reports.s2.title",
      bodyKey: "help.reports.s2.body",
      side: "bottom",
      align: "end",
    },
    {
      element: '[data-tour="reports-kpis"]',
      titleKey: "help.reports.s3.title",
      bodyKey: "help.reports.s3.body",
      side: "bottom",
    },
    {
      element: '[data-tour="reports-charts"]',
      titleKey: "help.reports.s4.title",
      bodyKey: "help.reports.s4.body",
      side: "top",
    },
  ],
  settings: [
    {
      element: '[data-tour="page-header"]',
      titleKey: "help.settings.s1.title",
      bodyKey: "help.settings.s1.body",
      side: "bottom",
      align: "start",
    },
    {
      element: '[data-tour="settings-general"]',
      titleKey: "help.settings.s2.title",
      bodyKey: "help.settings.s2.body",
      side: "bottom",
    },
    {
      element: '[data-tour="settings-ai"]',
      titleKey: "help.settings.s3.title",
      bodyKey: "help.settings.s3.body",
      side: "top",
    },
    {
      element: '[data-tour="settings-help"]',
      titleKey: "help.settings.s4.title",
      bodyKey: "help.settings.s4.body",
      side: "top",
    },
  ],
};

const ROUTE_SEGMENT_TO_ID: Record<string, PageTourId> = {
  accounts: "accounts",
  transactions: "transactions",
  categories: "categories",
  budgets: "budgets",
  goals: "goals",
  recurring: "recurring",
  debts: "debts",
  reports: "reports",
  settings: "settings",
};

/** Resolve the current pathname to a tour id, or null if the page has no tour. */
export function pageTourIdForPath(pathname: string): PageTourId | null {
  if (pathname === "/") return "dashboard";
  const segment = pathname.split("/").filter(Boolean)[0];
  return (segment && ROUTE_SEGMENT_TO_ID[segment]) || null;
}
