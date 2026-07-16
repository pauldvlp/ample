CREATE TABLE `exchange_rates` (
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`rate` real NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`base`, `quote`)
);
--> statement-breakpoint
ALTER TABLE `recurring_rules` ADD `original_amount` integer;--> statement-breakpoint
ALTER TABLE `recurring_rules` ADD `original_currency` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `original_amount` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `original_currency` text;