ALTER TABLE `settings` ADD `ui_font` text DEFAULT 'geist' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `ui_scale` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `simulation_active` integer DEFAULT false NOT NULL;