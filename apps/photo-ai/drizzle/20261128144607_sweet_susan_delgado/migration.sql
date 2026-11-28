CREATE TABLE `upload_sign_counters` (
	`voucher_id` integer PRIMARY KEY,
	`window_start` integer DEFAULT 0 NOT NULL,
	`window_count` integer DEFAULT 0 NOT NULL,
	`day_key` integer DEFAULT 0 NOT NULL,
	`day_count` integer DEFAULT 0 NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_upload_sign_counters_voucher_id_vouchers_id_fk` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`)
);
