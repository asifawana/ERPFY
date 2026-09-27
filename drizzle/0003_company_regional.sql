ALTER TABLE `core_companies` ADD `date_format` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `core_companies` ADD `number_format` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `core_companies` ADD `fiscal_year_start` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `core_companies` ADD `week_start` text DEFAULT '' NOT NULL;