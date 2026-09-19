CREATE TABLE `pilot_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`salt` text NOT NULL,
	`pin_hash` text NOT NULL,
	CONSTRAINT "pilot_role" CHECK("pilot_accounts"."role" IN ('Habitual','Reemplazo','Administrador'))
);

--> statement-breakpoint
CREATE TABLE `pilot_events` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`shift_id` text NOT NULL,
	`line_id` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer NOT NULL,
	`before_balance` integer NOT NULL,
	`after_balance` integer NOT NULL,
	`observations` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `pilot_shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`line_id`) REFERENCES `pilot_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pilot_kind" CHECK("pilot_events"."kind" IN ('Venta','Devolución','Ajuste positivo','Ajuste negativo')),
	CONSTRAINT "pilot_quantity" CHECK("pilot_events"."quantity">0),
	CONSTRAINT "pilot_after" CHECK("pilot_events"."after_balance">=0)
);

--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_events_request_id_unique` ON `pilot_events` (`request_id`);
--> statement-breakpoint
CREATE TABLE `pilot_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`product_id` text NOT NULL,
	`lot_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`lot_number` text,
	`expiry` text,
	`initial` integer NOT NULL,
	`balance` integer NOT NULL,
	`observations` text NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `pilot_shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pilot_initial" CHECK("pilot_lines"."initial">=0),
	CONSTRAINT "pilot_balance" CHECK("pilot_lines"."balance">=0)
);

--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_line_reference` ON `pilot_lines` (`shift_id`,`product_id`,`lot_id`);
--> statement-breakpoint
CREATE TABLE `pilot_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`holiday` integer DEFAULT 0 NOT NULL,
	`observations` text NOT NULL,
	`status` text NOT NULL,
	`delivered_by` text NOT NULL,
	`delivered_at` text NOT NULL,
	`accepted_by` text,
	`accepted_at` text,
	FOREIGN KEY (`delivered_by`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pilot_status" CHECK("pilot_shifts"."status" IN ('Entregado','En curso'))
);

--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_shifts_day_unique` ON `pilot_shifts` (`day`);