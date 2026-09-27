CREATE TABLE `eap_dev_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'unverified' NOT NULL,
	`website` text DEFAULT '',
	`support_email` text DEFAULT '',
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eap_dev_organizations_slug` ON `eap_dev_organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `eap_dev_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `eap_dev_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eap_dev_profiles_account` ON `eap_dev_profiles` (`account_id`);--> statement-breakpoint
CREATE INDEX `eap_dev_profiles_org` ON `eap_dev_profiles` (`organization_id`);--> statement-breakpoint
CREATE TABLE `eap_dev_members` (
	`organization_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text DEFAULT 'developer' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `account_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `eap_dev_organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `eap_apps` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`short_description` text NOT NULL,
	`full_description` text DEFAULT '',
	`category` text NOT NULL,
	`app_type` text DEFAULT 'public' NOT NULL,
	`official_app` integer DEFAULT 0 NOT NULL,
	`pricing_type` text DEFAULT 'free' NOT NULL,
	`price_amount` real DEFAULT 0 NOT NULL,
	`icon_url` text DEFAULT '',
	`banner_url` text DEFAULT '',
	`support_email` text DEFAULT '',
	`docs_url` text DEFAULT '',
	`privacy_url` text DEFAULT '',
	`status` text DEFAULT 'draft' NOT NULL,
	`is_killed` integer DEFAULT 0 NOT NULL,
	`kill_reason` text DEFAULT '',
	`created_by_account_id` text NOT NULL,
	`first_uploaded_at` integer,
	`submitted_at` integer,
	`approved_at` integer,
	`approved_by` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `eap_dev_organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eap_apps_slug` ON `eap_apps` (`slug`);--> statement-breakpoint
CREATE INDEX `eap_apps_org` ON `eap_apps` (`organization_id`);--> statement-breakpoint
CREATE INDEX `eap_apps_status` ON `eap_apps` (`status`);--> statement-breakpoint
CREATE TABLE `eap_app_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`version` text NOT NULL,
	`protocol` text DEFAULT 'eap-v1' NOT NULL,
	`min_platform_version` text DEFAULT '1.0.0' NOT NULL,
	`manifest_json` text NOT NULL,
	`changelog` text DEFAULT '',
	`package_hash` text DEFAULT '',
	`signature` text DEFAULT '',
	`release_id` text DEFAULT '',
	`review_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`approved_at` integer,
	`published_at` integer,
	FOREIGN KEY (`app_id`) REFERENCES `eap_apps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eap_app_versions_app_ver` ON `eap_app_versions` (`app_id`, `version`);--> statement-breakpoint
CREATE INDEX `eap_app_versions_app` ON `eap_app_versions` (`app_id`);--> statement-breakpoint
CREATE TABLE `eap_app_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`reviewer_account_id` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`automated_scan_result` text DEFAULT 'PASS' NOT NULL,
	`automated_scan_details` text DEFAULT '{}',
	`reviewer_notes` text DEFAULT '',
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`version_id`) REFERENCES `eap_app_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `eap_app_reviews_version` ON `eap_app_reviews` (`version_id`);--> statement-breakpoint
CREATE TABLE `eap_app_review_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`sender_account_id` text NOT NULL,
	`sender_type` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `eap_app_reviews`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `eap_app_review_messages_review` ON `eap_app_review_messages` (`review_id`);--> statement-breakpoint
CREATE TABLE `eap_dev_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`client_id` text NOT NULL,
	`client_secret_hash` text NOT NULL,
	`environment` text DEFAULT 'development' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`app_id`) REFERENCES `eap_apps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eap_dev_credentials_client_id` ON `eap_dev_credentials` (`client_id`);--> statement-breakpoint
CREATE INDEX `eap_dev_credentials_app` ON `eap_dev_credentials` (`app_id`);--> statement-breakpoint
CREATE TABLE `eap_app_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`app_id` text NOT NULL,
	`version_id` text NOT NULL,
	`installed_by_account_id` text NOT NULL,
	`status` text DEFAULT 'installed' NOT NULL,
	`granted_permissions` text DEFAULT '[]' NOT NULL,
	`configuration` text DEFAULT '{}' NOT NULL,
	`installed_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`uninstalled_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `eap_apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `eap_app_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`installed_by_account_id`) REFERENCES `core_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eap_app_installations_company_app` ON `eap_app_installations` (`company_id`, `app_id`);--> statement-breakpoint
CREATE INDEX `eap_app_installations_company` ON `eap_app_installations` (`company_id`);--> statement-breakpoint
CREATE TABLE `eap_app_webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`company_id` text NOT NULL,
	`event_type` text NOT NULL,
	`endpoint_url` text NOT NULL,
	`secret` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_triggered_at` integer,
	FOREIGN KEY (`app_id`) REFERENCES `eap_apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `eap_app_webhooks_company` ON `eap_app_webhooks` (`company_id`);--> statement-breakpoint
CREATE TABLE `eap_app_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`app_id` text,
	`version_id` text,
	`company_id` text,
	`action` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`ip_address` text DEFAULT '',
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `eap_app_audit_logs_app` ON `eap_app_audit_logs` (`app_id`);--> statement-breakpoint
CREATE INDEX `eap_app_audit_logs_company` ON `eap_app_audit_logs` (`company_id`);
