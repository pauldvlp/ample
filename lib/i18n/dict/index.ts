import type { Dict } from './_types';
import { common } from './common';
import { appshell } from './appshell';
import { dashboard } from './dashboard';
import { accounts } from './accounts';
import { transactions } from './transactions';
import { categories } from './categories';
import { budgets } from './budgets';
import { goals } from './goals';
import { recurring } from './recurring';
import { reports } from './reports';
import { settings } from './settings';
import { debts } from './debts';
import { ai } from './ai';
import { help } from './help';

const namespaces: Dict[] = [
  common,
  appshell,
  dashboard,
  accounts,
  transactions,
  categories,
  budgets,
  goals,
  recurring,
  reports,
  settings,
  debts,
  ai,
  help,
];

export const dict = {
  es: Object.assign({}, ...namespaces.map((n) => n.es)) as Record<string, string>,
  en: Object.assign({}, ...namespaces.map((n) => n.en)) as Record<string, string>,
};
