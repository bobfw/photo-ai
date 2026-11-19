CREATE TABLE `generated_image_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`image_id` integer NOT NULL,
	`image_url` text NOT NULL,
	`instruction` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_generated_image_versions_image_id_generated_images_id_fk` FOREIGN KEY (`image_id`) REFERENCES `generated_images`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_generated_image_versions_image` ON `generated_image_versions` (`image_id`);--> statement-breakpoint
INSERT INTO `generated_image_versions` (`image_id`, `image_url`, `instruction`, `created_at`)
SELECT `id`, `image_url`, NULL, `created_at` FROM `generated_images`;