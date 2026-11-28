CREATE TABLE `generation_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`voucher_id` integer NOT NULL,
	`client_token` text NOT NULL UNIQUE,
	`kind` text NOT NULL,
	`image_id` integer,
	`series` text NOT NULL,
	`pose_index` integer NOT NULL,
	`ratio` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`provider_task_id` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_generation_tasks_voucher_id_vouchers_id_fk` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`voucher_id` integer NOT NULL,
	`key` text NOT NULL UNIQUE,
	`url` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_uploads_voucher_id_vouchers_id_fk` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`)
);
--> statement-breakpoint
ALTER TABLE `generated_images` ADD `task_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_generated_images_task` ON `generated_images` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_generation_tasks_voucher` ON `generation_tasks` (`voucher_id`);--> statement-breakpoint
CREATE INDEX `idx_uploads_voucher` ON `uploads` (`voucher_id`);