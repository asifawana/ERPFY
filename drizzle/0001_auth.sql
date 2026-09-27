CREATE TABLE `core_credentials` (
	`account_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`password_updated_at` integer NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `core_identity_links` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`provider_email` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_identity_provider_user` ON `core_identity_links` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE INDEX `core_identity_account` ON `core_identity_links` (`account_id`);--> statement-breakpoint
CREATE TABLE `core_login_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_login_challenge_token` ON `core_login_challenges` (`token_hash`);--> statement-breakpoint
CREATE TABLE `core_one_time_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`purpose` text NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_one_time_hash` ON `core_one_time_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `core_one_time_account` ON `core_one_time_tokens` (`account_id`,`purpose`);--> statement-breakpoint
CREATE TABLE `core_recovery_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_recovery_hash` ON `core_recovery_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `core_recovery_account` ON `core_recovery_codes` (`account_id`);--> statement-breakpoint
CREATE TABLE `core_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_at` integer NOT NULL,
	`ip_address` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`device_label` text DEFAULT '' NOT NULL,
	`trusted_until` integer DEFAULT 0 NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_sessions_token` ON `core_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `core_sessions_account` ON `core_sessions` (`account_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `core_totp` (
	`account_id` text PRIMARY KEY NOT NULL,
	`secret_cipher` text NOT NULL,
	`secret_iv` text NOT NULL,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	`last_counter` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `core_accounts` ADD `email_verified_at` integer;