CREATE TABLE `eap_consumed_tokens` (
	`jti` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`app_id` text NOT NULL,
	`installation_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `core_companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `eap_apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`installation_id`) REFERENCES `eap_app_installations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_eap_consumed_tokens_expires` ON `eap_consumed_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_eap_consumed_tokens_company` ON `eap_consumed_tokens` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_eap_consumed_tokens_installation` ON `eap_consumed_tokens` (`installation_id`);
