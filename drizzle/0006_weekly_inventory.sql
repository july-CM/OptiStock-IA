CREATE TABLE `pilot_archived_shifts` (
	`shift_id` text PRIMARY KEY NOT NULL,
	`update_id` text NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `pilot_shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`update_id`) REFERENCES `pilot_weekly_updates`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TABLE `pilot_weekly_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`filename` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`quantities_json` text NOT NULL,
	FOREIGN KEY (`actor`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
