CREATE TABLE `generated_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`voucher_id` integer NOT NULL,
	`storage_key` text NOT NULL,
	`face_keys` text NOT NULL,
	`scene_id` text NOT NULL,
	`mode` text NOT NULL,
	`edit_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	CONSTRAINT `fk_generated_images_voucher_id_vouchers_id_fk` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`)
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`code` text NOT NULL UNIQUE,
	`type` text NOT NULL,
	`total_images` integer NOT NULL,
	`generated_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_generated_images_voucher` ON `generated_images` (`voucher_id`);--> statement-breakpoint
CREATE INDEX `idx_generated_images_expires` ON `generated_images` (`expires_at`);