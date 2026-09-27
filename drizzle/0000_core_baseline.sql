CREATE TABLE `core_account_preferences` (
	`account_id` text PRIMARY KEY NOT NULL,
	`email_account_activity` integer DEFAULT 1 NOT NULL,
	`email_security_alerts` integer DEFAULT 1 NOT NULL,
	`email_billing_notices` integer DEFAULT 1 NOT NULL,
	`email_product_updates` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `core_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_accounts_email` ON `core_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `core_activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`account_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `core_activity_company_time` ON `core_activity_events` (`company_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `core_activity_account_time` ON `core_activity_events` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `core_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`country_code` text NOT NULL,
	`currency` text NOT NULL,
	`timezone` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`sector_slug` text DEFAULT '' NOT NULL,
	`industry_slug` text DEFAULT '' NOT NULL,
	`business_models` text DEFAULT '[]' NOT NULL,
	`employee_band` text DEFAULT '' NOT NULL,
	`plan` text DEFAULT 'starter' NOT NULL,
	`state` text DEFAULT 'trial' NOT NULL,
	`trial_ends_at` integer NOT NULL,
	`onboarding_state` text DEFAULT 'not_started' NOT NULL,
	`onboarding_steps` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`request_key` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_companies_slug` ON `core_companies` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `core_companies_request` ON `core_companies` (`created_by`,`request_key`);--> statement-breakpoint
CREATE INDEX `core_companies_creator` ON `core_companies` (`created_by`);--> statement-breakpoint
CREATE TABLE `core_company_visits` (
	`account_id` text NOT NULL,
	`company_id` text NOT NULL,
	`last_opened_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `company_id`),
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `core_visits_recent` ON `core_company_visits` (`account_id`,`last_opened_at`);--> statement-breakpoint
CREATE TABLE `core_favorites` (
	`account_id` text NOT NULL,
	`company_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `company_id`),
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `core_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_invitations_pending` ON `core_invitations` (`company_id`,`email`);--> statement-breakpoint
CREATE INDEX `core_invitations_email` ON `core_invitations` (`email`);--> statement-breakpoint
CREATE TABLE `core_memberships` (
	`company_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`branch_scope` text DEFAULT '' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`company_id`, `account_id`),
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `core_memberships_account` ON `core_memberships` (`account_id`);