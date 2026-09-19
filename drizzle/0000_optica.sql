CREATE TABLE `counts` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`lot_id` text,
	`frequency` text NOT NULL,
	`period` text NOT NULL,
	`expected` integer NOT NULL,
	`actual` integer NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE INDEX `counts_period` ON `counts` (`frequency`,`period`);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`number` text NOT NULL,
	`expiry` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "lot_stock_nonnegative" CHECK("lots"."stock" >= 0)
);

--> statement-breakpoint
CREATE UNIQUE INDEX `lots_product_number` ON `lots` (`product_id`,`number`);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`lot_id` text,
	`kind` text NOT NULL,
	`delta` integer NOT NULL,
	`before` integer NOT NULL,
	`after` integer NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE INDEX `movements_date` ON `movements` (`created_at`);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`received` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Pendiente' NOT NULL,
	`approved_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_valid_quantities" CHECK("orders"."quantity">0 AND "orders"."received">=0 AND "orders"."received"<="orders"."quantity")
);

--> statement-breakpoint
CREATE UNIQUE INDEX `orders_open_product` ON `orders` (`product_id`) WHERE "orders"."status" IN ('Pendiente','Aprobada');
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '' NOT NULL,
	`size` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`minimum` integer NOT NULL,
	`maximum` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`last_event` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("products"."stock" >= 0),
	CONSTRAINT "thresholds_valid" CHECK("products"."minimum" >= 0 AND "products"."maximum" >= "products"."minimum")
);

--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
