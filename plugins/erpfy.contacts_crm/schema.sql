-- ERPFY Universal Contacts / CRM / Party Master Foundation Plugin Schema
-- Plugin ID: erpfy.contacts_crm
-- Protocol: eap-v1

CREATE TABLE IF NOT EXISTS `crm_parties` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_type` text NOT NULL,
	`display_name` text NOT NULL,
	`legal_name` text DEFAULT '' NOT NULL,
	`first_name` text DEFAULT '' NOT NULL,
	`middle_name` text DEFAULT '' NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`primary_email` text DEFAULT '' NOT NULL,
	`primary_phone` text DEFAULT '' NOT NULL,
	`primary_mobile` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`tax_identifier` text DEFAULT '' NOT NULL,
	`registration_identifier` text DEFAULT '' NOT NULL,
	`preferred_language` text DEFAULT 'en' NOT NULL,
	`preferred_currency` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`owner_user_id` text DEFAULT '' NOT NULL,
	`custom_fields_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_parties_company_idx` ON `crm_parties` (`company_id`);
CREATE INDEX IF NOT EXISTS `crm_parties_status_idx` ON `crm_parties` (`company_id`, `status`);
CREATE INDEX IF NOT EXISTS `crm_parties_email_idx` ON `crm_parties` (`company_id`, `primary_email`);
CREATE INDEX IF NOT EXISTS `crm_parties_phone_idx` ON `crm_parties` (`company_id`, `primary_phone`);
CREATE INDEX IF NOT EXISTS `crm_parties_tax_idx` ON `crm_parties` (`company_id`, `tax_identifier`);

CREATE TABLE IF NOT EXISTS `crm_party_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`role_key` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `crm_party_roles_unique` ON `crm_party_roles` (`company_id`, `party_id`, `role_key`);
CREATE INDEX IF NOT EXISTS `crm_party_roles_key_idx` ON `crm_party_roles` (`company_id`, `role_key`);

CREATE TABLE IF NOT EXISTS `crm_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`first_name` text DEFAULT '' NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`mobile` text DEFAULT '' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`is_primary` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_contacts_party_idx` ON `crm_contacts` (`company_id`, `party_id`);

CREATE TABLE IF NOT EXISTS `crm_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`type` text DEFAULT 'billing' NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`line1` text NOT NULL,
	`line2` text DEFAULT '' NOT NULL,
	`city` text NOT NULL,
	`state` text DEFAULT '' NOT NULL,
	`postal_code` text DEFAULT '' NOT NULL,
	`country_code` text NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_addresses_party_idx` ON `crm_addresses` (`company_id`, `party_id`);

CREATE TABLE IF NOT EXISTS `crm_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`source_party_id` text NOT NULL,
	`target_party_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_relationships_source_idx` ON `crm_relationships` (`company_id`, `source_party_id`);
CREATE INDEX IF NOT EXISTS `crm_relationships_target_idx` ON `crm_relationships` (`company_id`, `target_party_id`);

CREATE TABLE IF NOT EXISTS `crm_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#10B981' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `crm_tags_company_name` ON `crm_tags` (`company_id`, `name`);

CREATE TABLE IF NOT EXISTS `crm_party_tags` (
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`party_id`, `tag_id`),
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `crm_tags`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `crm_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`author_account_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_notes_party_idx` ON `crm_notes` (`company_id`, `party_id`);

CREATE TABLE IF NOT EXISTS `crm_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`type` text NOT NULL,
	`subject` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` integer,
	`completed_at` integer,
	`assigned_user_id` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_activities_party_idx` ON `crm_activities` (`company_id`, `party_id`);
CREATE INDEX IF NOT EXISTS `crm_activities_status_idx` ON `crm_activities` (`company_id`, `status`);

CREATE TABLE IF NOT EXISTS `crm_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'opted_in' NOT NULL,
	`captured_at` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `crm_consents_unique` ON `crm_consents` (`company_id`, `party_id`, `channel`);

CREATE TABLE IF NOT EXISTS `crm_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`estimated_value` real DEFAULT 0 NOT NULL,
	`assigned_user_id` text DEFAULT '' NOT NULL,
	`converted_at` integer,
	`converted_party_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_leads_company_idx` ON `crm_leads` (`company_id`, `status`);

CREATE TABLE IF NOT EXISTS `crm_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`name` text NOT NULL,
	`stage` text DEFAULT 'qualification' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`probability` integer DEFAULT 50 NOT NULL,
	`expected_close_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`party_id`) REFERENCES `crm_parties`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_opportunities_stage_idx` ON `crm_opportunities` (`company_id`, `stage`);

CREATE TABLE IF NOT EXISTS `crm_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`party_id` text NOT NULL,
	`actor_account_id` text NOT NULL,
	`action` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `crm_audit_events_party_idx` ON `crm_audit_events` (`company_id`, `party_id`);
CREATE INDEX IF NOT EXISTS `crm_audit_events_time_idx` ON `crm_audit_events` (`company_id`, `created_at`);
