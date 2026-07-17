import type { AccountType, CategoryKind } from '@/db/schema';

/* ----------------------------- account types ------------------------------ */

export type AccountGroup = 'asset' | 'liability';

export interface AccountTypeMeta {
  label: string;
  icon: string; // lucide icon key, resolved by <DynamicIcon>
  group: AccountGroup;
  description: string;
}

export const ACCOUNT_TYPE_META: Record<AccountType, AccountTypeMeta> = {
  checking: {
    label: 'Checking',
    icon: 'Wallet',
    group: 'asset',
    description: 'Everyday spending account',
  },
  savings: {
    label: 'Savings',
    icon: 'PiggyBank',
    group: 'asset',
    description: 'Money set aside to grow',
  },
  cash: {
    label: 'Cash',
    icon: 'Banknote',
    group: 'asset',
    description: 'Physical cash on hand',
  },
  investment: {
    label: 'Investment',
    icon: 'TrendingUp',
    group: 'asset',
    description: 'Brokerage, retirement, crypto',
  },
  credit: {
    label: 'Credit Card',
    icon: 'CreditCard',
    group: 'liability',
    description: 'Revolving credit balance',
  },
  loan: {
    label: 'Loan',
    icon: 'Landmark',
    group: 'liability',
    description: 'Mortgage, auto, student loan',
  },
  other: {
    label: 'Other',
    icon: 'Coins',
    group: 'asset',
    description: 'Anything else you track',
  },
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'checking',
  'savings',
  'cash',
  'investment',
  'credit',
  'loan',
  'other',
];

/* ------------------------------- palettes --------------------------------- */

/** Harmonious warm palette (evergreen → sage → brass → clay → dusk) used for
 *  category dots and chart series. Reads as one family, never a rainbow. */
export const CATEGORY_PALETTE = [
  '#2C6152', // pine (brand)
  '#3E8C74', // evergreen
  '#4C9C86', // sage green
  '#6FAE8E', // soft sage
  '#8AA36B', // olive
  '#C8A24E', // brass
  '#D08A4E', // amber
  '#C97F4E', // clay-amber
  '#B5674C', // terracotta
  '#9A6A5C', // clay
  '#8A6F8E', // muted plum
  '#6E7BA0', // dusty blue
  '#5B8CA0', // teal blue
  '#4F9AA6', // lagoon
  '#B08968', // sand
  '#7E786C', // taupe
];

/** Recharts pulls these from CSS custom properties so light/dark swap in one
 *  place (see globals.css). */
export const CHART_SERIES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];
export const CHART_POSITIVE = 'var(--positive)';
export const CHART_NEGATIVE = 'var(--negative)';
export const CHART_BRASS = 'var(--brass)';
export const CHART_PRIMARY = 'var(--primary)';
export const CHART_GRID = 'var(--chart-grid)';
export const CHART_AXIS = 'var(--chart-axis)';

/* --------------------------- default categories --------------------------- */

export interface CategorySeed {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  // income
  { name: 'Salary', kind: 'income', icon: 'Briefcase', color: '#2C6152' },
  { name: 'Freelance', kind: 'income', icon: 'Laptop', color: '#3E8C74' },
  { name: 'Investments', kind: 'income', icon: 'LineChart', color: '#4C9C86' },
  { name: 'Interest', kind: 'income', icon: 'Percent', color: '#6FAE8E' },
  { name: 'Gifts', kind: 'income', icon: 'Gift', color: '#C8A24E' },
  { name: 'Other Income', kind: 'income', icon: 'Plus', color: '#8AA36B' },
  // expense
  { name: 'Groceries', kind: 'expense', icon: 'ShoppingCart', color: '#3E8C74' },
  { name: 'Dining', kind: 'expense', icon: 'Utensils', color: '#C97F4E' },
  { name: 'Housing', kind: 'expense', icon: 'Home', color: '#2C6152' },
  { name: 'Utilities', kind: 'expense', icon: 'Zap', color: '#C8A24E' },
  { name: 'Transport', kind: 'expense', icon: 'Bus', color: '#6E7BA0' },
  { name: 'Fuel', kind: 'expense', icon: 'Fuel', color: '#B5674C' },
  { name: 'Shopping', kind: 'expense', icon: 'ShoppingBag', color: '#8A6F8E' },
  { name: 'Health', kind: 'expense', icon: 'HeartPulse', color: '#C1543F' },
  { name: 'Insurance', kind: 'expense', icon: 'ShieldCheck', color: '#5B8CA0' },
  { name: 'Entertainment', kind: 'expense', icon: 'Clapperboard', color: '#9A6A5C' },
  { name: 'Subscriptions', kind: 'expense', icon: 'Repeat', color: '#4F9AA6' },
  { name: 'Travel', kind: 'expense', icon: 'Plane', color: '#4C9C86' },
  { name: 'Education', kind: 'expense', icon: 'GraduationCap', color: '#6FAE8E' },
  { name: 'Fitness', kind: 'expense', icon: 'Dumbbell', color: '#8AA36B' },
  { name: 'Personal Care', kind: 'expense', icon: 'Sparkles', color: '#B08968' },
  { name: 'Pets', kind: 'expense', icon: 'PawPrint', color: '#D08A4E' },
  { name: 'Gifts & Donations', kind: 'expense', icon: 'HandHeart', color: '#C8A24E' },
  { name: 'Taxes', kind: 'expense', icon: 'Landmark', color: '#7E786C' },
  { name: 'Fees', kind: 'expense', icon: 'Receipt', color: '#9A6A5C' },
  { name: 'Other', kind: 'expense', icon: 'MoreHorizontal', color: '#7E786C' },
];

/** Icon options offered in category/account pickers. */
export const ICON_OPTIONS = [
  'Wallet',
  'PiggyBank',
  'CreditCard',
  'Banknote',
  'Coins',
  'TrendingUp',
  'Landmark',
  'Briefcase',
  'Laptop',
  'LineChart',
  'Percent',
  'Gift',
  'ShoppingCart',
  'ShoppingBag',
  'Utensils',
  'Coffee',
  'Home',
  'Zap',
  'Wifi',
  'Bus',
  'Car',
  'Fuel',
  'Plane',
  'Train',
  'HeartPulse',
  'Stethoscope',
  'ShieldCheck',
  'Clapperboard',
  'Music',
  'Gamepad2',
  'Repeat',
  'GraduationCap',
  'Dumbbell',
  'Sparkles',
  'PawPrint',
  'Baby',
  'HandHeart',
  'Receipt',
  'Phone',
  'Shirt',
  'Scissors',
  'TreePine',
  'Sun',
  'Umbrella',
  'Wrench',
  'Book',
  'Camera',
  'Palette',
  'Rocket',
  'Star',
  'MoreHorizontal',
];

/* -------------------------------- currencies ------------------------------ */

export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: '$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: '$' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'MXN', label: 'Mexican Peso', symbol: '$' },
  { code: 'HNL', label: 'Lempira Hondureño', symbol: 'L' },
  { code: 'GTQ', label: 'Quetzal Guatemalteco', symbol: 'Q' },
  { code: 'CRC', label: 'Colón Costarricense', symbol: '₡' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { code: 'ARS', label: 'Argentine Peso', symbol: '$' },
  { code: 'COP', label: 'Colombian Peso', symbol: '$' },
  { code: 'CLP', label: 'Chilean Peso', symbol: '$' },
  { code: 'SEK', label: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', label: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: '$' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: '$' },
];

export const LOCALES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'es-HN', label: 'Español (Honduras)' },
  { code: 'es-AR', label: 'Español (Argentina)' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'ja-JP', label: '日本語' },
];

/** Selectable UI fonts (see app/fonts.ts + globals.css data-font rules). */
export const UI_FONTS: { value: string; label: string }[] = [
  { value: 'geist', label: 'Geist' },
  { value: 'onest', label: 'Onest' },
  { value: 'outfit', label: 'Outfit' },
  { value: 'inter', label: 'Inter' },
  { value: 'jakarta', label: 'Plus Jakarta Sans' },
  { value: 'space', label: 'Space Grotesk' },
];

/** UI zoom presets (root font-size %). */
export const ZOOM_STEPS = [90, 100, 110, 120];
