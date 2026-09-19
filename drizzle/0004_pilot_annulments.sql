CREATE TABLE `pilot_annulments` (
	`event_id` text PRIMARY KEY NOT NULL,
	`observations` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`before_balance` integer NOT NULL,
	`after_balance` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `pilot_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "annulment_balance" CHECK("pilot_annulments"."after_balance">=0)
);
