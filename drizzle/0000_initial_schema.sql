CREATE TABLE `action_log` (
	`id` text PRIMARY KEY NOT NULL,
	`ts` text NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`undoes` text,
	`rowid` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `action_log_ts` ON `action_log` (`ts`);--> statement-breakpoint
CREATE INDEX `action_log_rowid` ON `action_log` (`rowid`);--> statement-breakpoint
CREATE INDEX `action_log_undoes` ON `action_log` (`undoes`);--> statement-breakpoint
CREATE TABLE `record` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction` text NOT NULL,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`paid_by` text NOT NULL,
	`beneficiary` text NOT NULL,
	`nature` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`archive` integer DEFAULT false NOT NULL,
	`hide` integer DEFAULT false NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `record_date` ON `record` (`date`);--> statement-breakpoint
CREATE INDEX `record_nature` ON `record` (`nature`);