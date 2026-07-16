CREATE TABLE `debt_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `debt_payments_debt_idx` ON `debt_payments` (`debt_id`);--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`counterparty` text NOT NULL,
	`name` text,
	`principal` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`original_amount` integer,
	`original_currency` text,
	`account_id` text,
	`opened_date` integer NOT NULL,
	`due_date` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`icon` text,
	`color` text,
	`notes` text,
	`include_in_net_worth` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `debts_kind_idx` ON `debts` (`kind`);--> statement-breakpoint
CREATE INDEX `debts_status_idx` ON `debts` (`status`);--> statement-breakpoint
CREATE TABLE `payees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text,
	`icon` text,
	`color` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payees_name_idx` ON `payees` (`name`);--> statement-breakpoint
ALTER TABLE `settings` ADD `sim_date` integer;