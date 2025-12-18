CREATE TABLE `disciplines` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`class` text,
	`schedule` text,
	`last_sync_at` integer
);
--> statement-breakpoint
CREATE TABLE `task_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`task_id` integer,
	`level` text,
	`message` text,
	`screenshot_path` text,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'PENDING',
	`payload` text,
	`result` text,
	`progress` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`studus_username` text,
	`studus_password` text,
	`cookies` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);