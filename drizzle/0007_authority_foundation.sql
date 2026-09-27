CREATE TABLE `core_branches` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_main` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_branches_company_code` ON `core_branches` (`company_id`,`code`);--> statement-breakpoint
CREATE INDEX `core_branches_company_status` ON `core_branches` (`company_id`,`status`);--> statement-breakpoint
CREATE TABLE `core_membership_branches` (
	`company_id` text NOT NULL,
	`account_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	`assigned_by` text NOT NULL,
	PRIMARY KEY(`company_id`, `account_id`, `branch_id`),
	FOREIGN KEY (`branch_id`) REFERENCES `core_branches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `core_membership_branches_branch` ON `core_membership_branches` (`branch_id`);--> statement-breakpoint
CREATE TABLE `core_membership_roles` (
	`company_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	`assigned_by` text NOT NULL,
	PRIMARY KEY(`company_id`, `account_id`, `role_id`),
	FOREIGN KEY (`role_id`) REFERENCES `core_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `core_membership_roles_role` ON `core_membership_roles` (`role_id`);--> statement-breakpoint
CREATE TABLE `core_permission_overrides` (
	`company_id` text NOT NULL,
	`account_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`effect` text NOT NULL,
	`scope` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	PRIMARY KEY(`company_id`, `account_id`, `permission_key`),
	FOREIGN KEY (`permission_key`) REFERENCES `core_permissions`(`key`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `core_permission_overrides_account` ON `core_permission_overrides` (`account_id`,`company_id`);--> statement-breakpoint
CREATE TABLE `core_permissions` (
	`key` text PRIMARY KEY NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `core_role_permissions` (
	`role_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`effect` text NOT NULL,
	`scope` text NOT NULL,
	PRIMARY KEY(`role_id`, `permission_key`),
	FOREIGN KEY (`role_id`) REFERENCES `core_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_key`) REFERENCES `core_permissions`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `core_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_roles_company_key` ON `core_roles` (`company_id`,`key`);--> statement-breakpoint
CREATE INDEX `core_roles_company` ON `core_roles` (`company_id`);