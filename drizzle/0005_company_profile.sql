ALTER TABLE `core_companies` ADD `expected_users` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `core_companies` ADD `branch_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `core_companies` ADD `operating_countries` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `core_companies` ADD `activities` text DEFAULT '[]' NOT NULL;