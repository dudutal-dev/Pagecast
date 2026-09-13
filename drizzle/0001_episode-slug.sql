ALTER TABLE `episodes` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_slug_unique` ON `episodes` (`slug`);