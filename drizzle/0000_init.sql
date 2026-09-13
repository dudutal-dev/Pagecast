CREATE TABLE `audio_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`path` text NOT NULL,
	`duration_sec` real NOT NULL,
	`size_bytes` integer NOT NULL,
	`voice_id` text NOT NULL,
	`model_id` text NOT NULL,
	`voice_settings` text NOT NULL,
	`script_hash` text NOT NULL,
	`alignment` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audio_assets_episode_id_unique` ON `audio_assets` (`episode_id`);--> statement-breakpoint
CREATE INDEX `audio_assets_episode_idx` ON `audio_assets` (`episode_id`);--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`title_en` text,
	`author` text NOT NULL,
	`author_en` text,
	`year` integer,
	`domain` text NOT NULL,
	`kind` text DEFAULT 'nonfiction' NOT NULL,
	`message` text NOT NULL,
	`summary_md` text NOT NULL,
	`script` text NOT NULL,
	`performed_script` text,
	`takeaways` text DEFAULT '[]' NOT NULL,
	`takeaways_done` text DEFAULT '[]' NOT NULL,
	`caveat` text DEFAULT '' NOT NULL,
	`knowledge_today` text,
	`cover_url` text,
	`card_svg` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `episodes_domain_idx` ON `episodes` (`domain`);--> statement-breakpoint
CREATE INDEX `episodes_status_idx` ON `episodes` (`status`);--> statement-breakpoint
CREATE INDEX `episodes_created_idx` ON `episodes` (`created_at`);--> statement-breakpoint
CREATE TABLE `listen_progress` (
	`episode_id` text PRIMARY KEY NOT NULL,
	`position_sec` real DEFAULT 0 NOT NULL,
	`completed_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `playlist_items` (
	`playlist_id` text NOT NULL,
	`episode_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`playlist_id`, `episode_id`),
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`podcast_name` text NOT NULL,
	`host_name` text DEFAULT '' NOT NULL,
	`voice_id` text,
	`voice_name` text,
	`voice_model` text NOT NULL,
	`voice_settings` text NOT NULL,
	`default_rate` real DEFAULT 1 NOT NULL,
	`theme` text DEFAULT 'auto' NOT NULL,
	`onboarding_done` integer DEFAULT false NOT NULL,
	`price_per_char` real NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `voice_previews` (
	`key` text PRIMARY KEY NOT NULL,
	`voice_id` text NOT NULL,
	`path` text NOT NULL,
	`created_at` text NOT NULL
);
