PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`base_currency` text DEFAULT 'USD' NOT NULL,
	`locale` text DEFAULT 'en-US' NOT NULL,
	`language` text DEFAULT 'es' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`first_day_of_week` integer DEFAULT 1 NOT NULL,
	`budget_start_day` integer DEFAULT 1 NOT NULL,
	`hide_amounts` integer DEFAULT false NOT NULL,
	`ui_font` text DEFAULT 'geist' NOT NULL,
	`ui_scale` integer DEFAULT 100 NOT NULL,
	`icon_stroke` real DEFAULT 2 NOT NULL,
	`simulation_active` integer DEFAULT false NOT NULL,
	`sim_date` integer,
	`display_name` text DEFAULT 'Ample' NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`tour_completed` integer DEFAULT false NOT NULL,
	`ai_enabled` integer DEFAULT false NOT NULL,
	`ai_provider` text,
	`ai_api_key` text,
	`ai_model` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "base_currency", "locale", "language", "theme", "first_day_of_week", "budget_start_day", "hide_amounts", "ui_font", "ui_scale", "icon_stroke", "simulation_active", "sim_date", "display_name", "onboarding_completed", "tour_completed", "ai_enabled", "ai_provider", "ai_api_key", "ai_model", "updated_at") SELECT "id", "base_currency", "locale", "language", "theme", "first_day_of_week", "budget_start_day", "hide_amounts", "ui_font", "ui_scale", "icon_stroke", "simulation_active", "sim_date", "display_name", "onboarding_completed", "tour_completed", "ai_enabled", "ai_provider", "ai_api_key", "ai_model", "updated_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;