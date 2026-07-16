ALTER TABLE `settings` ADD `icon_stroke` real DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `tour_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `ai_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `ai_provider` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `ai_api_key` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `ai_model` text;