import { relations } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { newId } from '@/lib/ids';

/* -------------------------------------------------------------------------- */
/*  Conventions                                                               */
/*  - Money is stored as SIGNED INTEGER minor units (cents). Never floats.    */
/*  - Dates/timestamps are stored as unix-ms integers (Drizzle `timestamp_ms`)*/
/*  - Booleans use integer 0/1 via Drizzle `mode: 'boolean'`.                 */
/*  - Primary keys are short nanoid text ids.                                 */
/* -------------------------------------------------------------------------- */

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => newId());

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

/* ------------------------------- settings --------------------------------- */

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(), // singleton row, always id = 1
  baseCurrency: text('base_currency').notNull().default('USD'),
  locale: text('locale').notNull().default('en-US'),
  language: text('language', { enum: ['es', 'en'] })
    .notNull()
    .default('es'),
  theme: text('theme', { enum: ['light', 'dark', 'system'] })
    .notNull()
    .default('system'),
  firstDayOfWeek: integer('first_day_of_week').notNull().default(1), // 1 = Monday
  budgetStartDay: integer('budget_start_day').notNull().default(1),
  hideAmounts: integer('hide_amounts', { mode: 'boolean' }).notNull().default(false),
  uiFont: text('ui_font').notNull().default('geist'),
  uiScale: integer('ui_scale').notNull().default(100),
  // global icon stroke multiplier (x1 / x1.25 / x1.5 / x2)
  iconStroke: real('icon_stroke').notNull().default(2),
  simulationActive: integer('simulation_active', { mode: 'boolean' }).notNull().default(false),
  // The simulated "now" while in simulation mode (time-machine). Null = real
  // clock. Lives on settings (which is excluded from the sim snapshot) so the
  // enter/exit actions must reset it explicitly.
  simDate: integer('sim_date', { mode: 'timestamp_ms' }),
  displayName: text('display_name').notNull().default('Ample'),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' })
    .notNull()
    .default(false),
  // guided product tour (driver.js) shown once on first run
  tourCompleted: integer('tour_completed', { mode: 'boolean' }).notNull().default(false),
  // ---- AI assistant (opt-in). The API key never leaves the server. ----
  aiEnabled: integer('ai_enabled', { mode: 'boolean' }).notNull().default(false),
  aiProvider: text('ai_provider', {
    enum: ['anthropic', 'openai', 'google'],
  }),
  aiApiKey: text('ai_api_key'),
  aiModel: text('ai_model'),
  updatedAt: updatedAt(),
});

export const AI_PROVIDERS = ['anthropic', 'openai', 'google'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/* ------------------------------- accounts --------------------------------- */

export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit',
  'cash',
  'investment',
  'loan',
  'other',
] as const;

export const accounts = sqliteTable(
  'accounts',
  {
    id: id(),
    name: text('name').notNull(),
    type: text('type', { enum: ACCOUNT_TYPES }).notNull().default('checking'),
    institution: text('institution'),
    currency: text('currency').notNull().default('USD'),
    startingBalance: integer('starting_balance').notNull().default(0),
    creditLimit: integer('credit_limit'),
    icon: text('icon'),
    color: text('color'),
    notes: text('notes'),
    includeInNetWorth: integer('include_in_net_worth', { mode: 'boolean' }).notNull().default(true),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('accounts_archived_idx').on(t.isArchived)],
);

/* ------------------------------ categories -------------------------------- */

export const CATEGORY_KINDS = ['income', 'expense', 'transfer'] as const;

export const categories = sqliteTable(
  'categories',
  {
    id: id(),
    name: text('name').notNull(),
    kind: text('kind', { enum: CATEGORY_KINDS }).notNull().default('expense'),
    parentId: text('parent_id'),
    icon: text('icon'),
    color: text('color'),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('categories_kind_idx').on(t.kind), index('categories_parent_idx').on(t.parentId)],
);

/* ------------------------------ transactions ------------------------------ */

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
export const TRANSACTION_STATUS = ['pending', 'cleared', 'reconciled'] as const;

export const transactions = sqliteTable(
  'transactions',
  {
    id: id(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    type: text('type', { enum: TRANSACTION_TYPES }).notNull().default('expense'),
    // signed cents in the BASE currency (drives all totals/reports)
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('USD'),
    // original foreign-currency price kept as reference (e.g. a USD subscription)
    originalAmount: integer('original_amount'),
    originalCurrency: text('original_currency'),
    date: integer('date', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    payee: text('payee'),
    notes: text('notes'),
    status: text('status', { enum: TRANSACTION_STATUS }).notNull().default('cleared'),
    // transfer bookkeeping
    transferAccountId: text('transfer_account_id'),
    transferGroupId: text('transfer_group_id'),
    // split bookkeeping
    isSplit: integer('is_split', { mode: 'boolean' }).notNull().default(false),
    parentTransactionId: text('parent_transaction_id'),
    recurringRuleId: text('recurring_rule_id'),
    externalId: text('external_id'),
    // Links a cash movement to the debt that produced it (opening draw or a
    // repayment). Lets deleteDebt reclaim that cash so net worth stays honest,
    // and lets income/expense reports exclude debt principal (not real earnings
    // or spending). Plain column, reconciled in lib/actions/debts.ts.
    debtId: text('debt_id'),
    // Links this cash movement to the specific debt payment it settles, so a
    // reverted payment (manual or scheduled installment) can delete exactly its
    // own transaction. Plain column, reconciled in lib/actions/debts.ts.
    debtPaymentId: text('debt_payment_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('tx_account_date_idx').on(t.accountId, t.date),
    index('tx_category_date_idx').on(t.categoryId, t.date),
    index('tx_date_idx').on(t.date),
    index('tx_transfer_group_idx').on(t.transferGroupId),
    index('tx_debt_idx').on(t.debtId),
  ],
);

/* --------------------------------- tags ----------------------------------- */

export const tags = sqliteTable(
  'tags',
  {
    id: id(),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('tags_name_idx').on(t.name)],
);

export const transactionTags = sqliteTable(
  'transaction_tags',
  {
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.transactionId, t.tagId] })],
);

/* --------------------------------- payees --------------------------------- */

/** Reusable payees / income sources (beneficiaries). Free-text `payee` on a
 *  transaction is kept as-is; this table just powers the creatable combobox. */
export const PAYEE_KINDS = ['income', 'expense'] as const;

export const payees = sqliteTable(
  'payees',
  {
    id: id(),
    name: text('name').notNull(),
    // hint for grouping (income source vs. merchant); null = applies to both
    kind: text('kind', { enum: PAYEE_KINDS }),
    icon: text('icon'),
    color: text('color'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('payees_name_idx').on(t.name)],
);

/* -------------------------------- budgets --------------------------------- */

export const budgets = sqliteTable(
  'budgets',
  {
    id: id(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    period: text('period').notNull(), // 'YYYY-MM'
    amount: integer('amount').notNull().default(0),
    rolloverEnabled: integer('rollover_enabled', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('budgets_cat_period_idx').on(t.categoryId, t.period)],
);

/* --------------------------------- goals ---------------------------------- */

export const GOAL_STATUS = ['active', 'completed', 'paused', 'archived'] as const;

export const goals = sqliteTable('goals', {
  id: id(),
  name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull().default(0),
  targetDate: integer('target_date', { mode: 'timestamp_ms' }),
  accountId: text('account_id').references(() => accounts.id, {
    onDelete: 'set null',
  }),
  icon: text('icon'),
  color: text('color'),
  notes: text('notes'),
  priority: integer('priority').notNull().default(0),
  status: text('status', { enum: GOAL_STATUS }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const goalContributions = sqliteTable(
  'goal_contributions',
  {
    id: id(),
    goalId: text('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    date: integer('date', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('goal_contrib_goal_idx').on(t.goalId)],
);

/* ---------------------------- recurring rules ----------------------------- */

export const FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;

export const recurringRules = sqliteTable(
  'recurring_rules',
  {
    id: id(),
    name: text('name').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    type: text('type', { enum: TRANSACTION_TYPES }).notNull().default('expense'),
    amount: integer('amount').notNull(),
    originalAmount: integer('original_amount'),
    originalCurrency: text('original_currency'),
    payee: text('payee'),
    frequency: text('frequency', { enum: FREQUENCIES }).notNull().default('monthly'),
    interval: integer('interval').notNull().default(1),
    startDate: integer('start_date', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    endDate: integer('end_date', { mode: 'timestamp_ms' }),
    nextDueDate: integer('next_due_date', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    lastGeneratedDate: integer('last_generated_date', { mode: 'timestamp_ms' }),
    autoPost: integer('auto_post', { mode: 'boolean' }).notNull().default(false),
    isSubscription: integer('is_subscription', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('recurring_next_due_idx').on(t.nextDueDate)],
);

/* --------------------------------- debts ---------------------------------- */

/** A debt is a person-to-person balance outside your accounts.
 *  - `receivable` = money owed TO you (an asset; increases net worth)
 *  - `payable`    = money YOU owe (a liability; decreases net worth)
 *  Outstanding = principal − sum(payments); when it reaches 0 the debt settles.
 *  `principal` is a positive magnitude in signed-cents of the BASE currency. */
export const DEBT_KINDS = ['receivable', 'payable'] as const;
export const DEBT_STATUS = ['open', 'settled'] as const;

export const debts = sqliteTable(
  'debts',
  {
    id: id(),
    kind: text('kind', { enum: DEBT_KINDS }).notNull(),
    // the other party (person or entity)
    counterparty: text('counterparty').notNull(),
    // optional label / reason ("Loan for laptop")
    name: text('name'),
    // positive magnitude, base-currency cents
    principal: integer('principal').notNull(),
    currency: text('currency').notNull().default('USD'),
    // foreign sticker price kept for reference (e.g. a debt agreed in USD)
    originalAmount: integer('original_amount'),
    originalCurrency: text('original_currency'),
    // optional account this debt is associated with (informational)
    accountId: text('account_id').references(() => accounts.id, {
      onDelete: 'set null',
    }),
    openedDate: integer('opened_date', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }),
    status: text('status', { enum: DEBT_STATUS }).notNull().default('open'),
    icon: text('icon'),
    color: text('color'),
    notes: text('notes'),
    includeInNetWorth: integer('include_in_net_worth', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('debts_kind_idx').on(t.kind), index('debts_status_idx').on(t.status)],
);

export const debtPayments = sqliteTable(
  'debt_payments',
  {
    id: id(),
    debtId: text('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    // positive magnitude, base-currency cents
    amount: integer('amount').notNull(),
    date: integer('date', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('debt_payments_debt_idx').on(t.debtId)],
);

/** A planned future payment on a debt (an installment / "cuota"). The schedule
 *  drives the simulation: as the time-machine passes an installment's `dueDate`
 *  it auto-posts the payment (reducing the debt's outstanding and moving cash in
 *  the linked account), exactly like a due recurring rule. A single-payment plan
 *  is just one installment for the full amount. `paidPaymentId` links to the
 *  `debt_payments` row created when it posts (null while still pending); clearing
 *  it reverts the installment to pending. Amounts are positive base-currency cents. */
export const debtInstallments = sqliteTable(
  'debt_installments',
  {
    id: id(),
    debtId: text('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    // planned amount for this installment, positive base-currency cents
    amount: integer('amount').notNull(),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }).notNull(),
    note: text('note'),
    // set to the debt_payments row created when this installment posts; null
    // while pending. Plain column (like transactions.debtId), reconciled in code.
    paidPaymentId: text('paid_payment_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('debt_installments_debt_idx').on(t.debtId),
    index('debt_installments_due_idx').on(t.dueDate),
  ],
);

/* ---------------------------- net worth snapshots ------------------------- */

export const netWorthSnapshots = sqliteTable(
  'net_worth_snapshots',
  {
    id: id(),
    date: integer('date', { mode: 'timestamp_ms' }).notNull(),
    totalAssets: integer('total_assets').notNull(),
    totalLiabilities: integer('total_liabilities').notNull(),
    netWorth: integer('net_worth').notNull(),
    source: text('source', { enum: ['manual', 'scheduled'] })
      .notNull()
      .default('scheduled'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('nw_date_idx').on(t.date)],
);

export const netWorthSnapshotBalances = sqliteTable('net_worth_snapshot_balances', {
  id: id(),
  snapshotId: text('snapshot_id')
    .notNull()
    .references(() => netWorthSnapshots.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => accounts.id, {
    onDelete: 'set null',
  }),
  balance: integer('balance').notNull(),
});

/* ------------------------------ exchange rates ---------------------------- */

export const exchangeRates = sqliteTable(
  'exchange_rates',
  {
    base: text('base').notNull(),
    quote: text('quote').notNull(),
    // value of 1 unit of `quote` expressed in `base` (e.g. 1 USD = 24.7 HNL)
    rate: real('rate').notNull(),
    source: text('source', { enum: ['manual', 'auto'] })
      .notNull()
      .default('auto'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote] })],
);

/* ------------------------------ chat threads ------------------------------ */

/** Persisted AI-assistant conversations. A thread groups an ordered list of
 *  chat_messages; the most-recently-updated threads show first in the history
 *  panel. Deleting a thread cascades to its messages. */
export const chatThreads = sqliteTable(
  'chat_threads',
  {
    id: id(),
    // Derived from the first user message; null only for a still-empty thread.
    title: text('title'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('chat_threads_updated_idx').on(t.updatedAt)],
);

/** One turn in a conversation. Assistant turns may carry a JSON-serialized
 *  ExecutedAction[] (the action chips shown under the reply) and an `error`
 *  flag for turns that failed. Ordered within a thread by createdAt. */
export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: id(),
    threadId: text('thread_id')
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull().default(''),
    // JSON-serialized ExecutedAction[] for assistant turns that ran tools; null otherwise.
    actions: text('actions'),
    error: integer('error', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('chat_messages_thread_idx').on(t.threadId, t.createdAt)],
);

/* -------------------------------- relations ------------------------------- */

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_parent',
  }),
  children: many(categories, { relationName: 'category_parent' }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  transferAccount: one(accounts, {
    fields: [transactions.transferAccountId],
    references: [accounts.id],
    relationName: 'transfer_account',
  }),
  transactionTags: many(transactionTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  transactionTags: many(transactionTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, {
    fields: [transactionTags.tagId],
    references: [tags.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  account: one(accounts, {
    fields: [goals.accountId],
    references: [accounts.id],
  }),
  contributions: many(goalContributions),
}));

export const goalContributionsRelations = relations(goalContributions, ({ one }) => ({
  goal: one(goals, {
    fields: [goalContributions.goalId],
    references: [goals.id],
  }),
}));

export const debtsRelations = relations(debts, ({ one, many }) => ({
  account: one(accounts, {
    fields: [debts.accountId],
    references: [accounts.id],
  }),
  payments: many(debtPayments),
  installments: many(debtInstallments),
}));

export const debtPaymentsRelations = relations(debtPayments, ({ one }) => ({
  debt: one(debts, {
    fields: [debtPayments.debtId],
    references: [debts.id],
  }),
}));

export const debtInstallmentsRelations = relations(debtInstallments, ({ one }) => ({
  debt: one(debts, {
    fields: [debtInstallments.debtId],
    references: [debts.id],
  }),
}));

export const recurringRulesRelations = relations(recurringRules, ({ one }) => ({
  account: one(accounts, {
    fields: [recurringRules.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [recurringRules.categoryId],
    references: [categories.id],
  }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, {
    fields: [chatMessages.threadId],
    references: [chatThreads.id],
  }),
}));

/* --------------------------------- types ---------------------------------- */

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type Payee = typeof payees.$inferSelect;
export type NewPayee = typeof payees.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type DebtPayment = typeof debtPayments.$inferSelect;
export type DebtInstallment = typeof debtInstallments.$inferSelect;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type CategoryKind = (typeof CATEGORY_KINDS)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type GoalStatus = (typeof GOAL_STATUS)[number];
export type PayeeKind = (typeof PAYEE_KINDS)[number];
export type DebtKind = (typeof DEBT_KINDS)[number];
export type DebtStatus = (typeof DEBT_STATUS)[number];

export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
