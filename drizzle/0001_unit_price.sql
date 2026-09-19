ALTER TABLE `products` ADD `unit_price` integer;
--> statement-breakpoint
ALTER TABLE `products` ADD `unit` text DEFAULT 'Unidad' NOT NULL;