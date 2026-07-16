ALTER TABLE `transactions` ADD `debt_id` text;--> statement-breakpoint
CREATE INDEX `tx_debt_idx` ON `transactions` (`debt_id`);