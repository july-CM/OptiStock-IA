CREATE TABLE `pilot_closures` (
	`shift_id` text PRIMARY KEY NOT NULL,
	`observations` text NOT NULL,
	`returned_by` text NOT NULL,
	`returned_at` text NOT NULL,
	`acknowledged_by` text,
	`acknowledged_at` text,
	FOREIGN KEY (`shift_id`) REFERENCES `pilot_shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`returned_by`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`acknowledged_by`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TABLE `pilot_physical_counts` (
	`line_id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`system_balance` integer NOT NULL,
	`physical` integer NOT NULL,
	`difference` integer NOT NULL,
	FOREIGN KEY (`line_id`) REFERENCES `pilot_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shift_id`) REFERENCES `pilot_closures`(`shift_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "physical_nonnegative" CHECK("pilot_physical_counts"."physical">=0)
);

--> statement-breakpoint
CREATE TABLE `pilot_receipts` (
	`shift_id` text PRIMARY KEY NOT NULL,
	`received_by` text NOT NULL,
	`received_at` text NOT NULL,
	`observations` text NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `pilot_closures`(`shift_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`received_by`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
