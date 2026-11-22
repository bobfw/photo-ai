CREATE TABLE `generated_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`voucher_id` integer NOT NULL,
	`image_url` text NOT NULL,
	`pose_index` integer NOT NULL,
	`series` text DEFAULT 'han-shi' NOT NULL,
	`ratio` text DEFAULT '2:3' NOT NULL,
	`edit_count` integer DEFAULT 0 NOT NULL,
	`versions` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	CONSTRAINT `fk_generated_images_voucher_id_vouchers_id_fk` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`)
);
--> statement-breakpoint
CREATE TABLE `generation_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`voucher_id` integer NOT NULL,
	`kind` text NOT NULL,
	`series` text NOT NULL,
	`pose_index` integer NOT NULL,
	`ratio` text NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_generation_records_voucher_id_vouchers_id_fk` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`)
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`code` text NOT NULL UNIQUE,
	`type` text NOT NULL,
	`total_images` integer NOT NULL,
	`generated_count` integer DEFAULT 0 NOT NULL,
	`max_edits` integer DEFAULT 5 NOT NULL,
	`platform` text,
	`terms_accepted_at` integer,
	`terms_accepted_ip` text,
	`terms_accepted_country` text,
	`terms_accepted_user_agent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_generated_images_voucher` ON `generated_images` (`voucher_id`);--> statement-breakpoint
CREATE INDEX `idx_generated_images_expires` ON `generated_images` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_generation_records_voucher` ON `generation_records` (`voucher_id`);--> statement-breakpoint
CREATE INDEX `idx_generation_records_created` ON `generation_records` (`created_at`);