ALTER TABLE `uploads` ADD `confirmed_at` integer;--> statement-breakpoint
-- 已有行都是旧流程确认过的上传，补成已确认，避免升级后无法生成
UPDATE `uploads` SET `confirmed_at` = `created_at` WHERE `confirmed_at` IS NULL;