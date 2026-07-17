import { format, formatDistanceToNowStrict, isToday, isYesterday, parse } from 'date-fns';

/** 'YYYY-MM' month key used for budgets and monthly grouping. */
export function monthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function monthKeyToDate(key: string): Date {
  return parse(key, 'yyyy-MM', new Date());
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function formatMonthLabel(key: string): string {
  return format(monthKeyToDate(key), 'MMMM yyyy');
}

export function formatMonthShort(key: string): string {
  return format(monthKeyToDate(key), 'MMM');
}

export function formatDate(date: Date | number, pattern = 'MMM d, yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatDateSmart(date: Date | number): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function formatRelative(date: Date | number): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

/** Group key for a transaction date shown as section headers. */
export function dateGroupLabel(date: Date | number): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMM d');
}

export function toDateInputValue(date: Date | number): string {
  return format(new Date(date), 'yyyy-MM-dd');
}

export function fromDateInputValue(value: string): Date {
  return parse(value, 'yyyy-MM-dd', new Date());
}
