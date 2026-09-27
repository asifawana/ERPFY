CREATE TABLE `core_company_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`steps` text DEFAULT '{}' NOT NULL,
	`state` text DEFAULT 'in_progress' NOT NULL,
	`request_key` text NOT NULL,
	`company_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `core_drafts_account` ON `core_company_drafts` (`account_id`,`state`);--> statement-breakpoint
ALTER TABLE `core_companies` ADD `legal_name` text DEFAULT '' NOT NULL;