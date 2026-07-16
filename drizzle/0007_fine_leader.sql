CREATE TABLE `debt_installments` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` integer NOT NULL,
	`note` text,
	`paid_payment_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `debt_installments_debt_idx` ON `debt_installments` (`debt_id`);--> statement-breakpoint
CREATE INDEX `debt_installments_due_idx` ON `debt_installments` (`due_date`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `debt_payment_id` text;