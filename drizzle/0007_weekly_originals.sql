CREATE TABLE `pilot_weekly_originals` (
	`update_id` text PRIMARY KEY NOT NULL,
	`bytes` blob NOT NULL,
	`mime` text NOT NULL,
	`sha256` text NOT NULL,
	FOREIGN KEY (`update_id`) REFERENCES `pilot_weekly_updates`(`id`) ON UPDATE no action ON DELETE no action
);
