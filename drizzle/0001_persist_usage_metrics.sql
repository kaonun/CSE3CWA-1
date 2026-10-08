CREATE TABLE `usage_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`recorded_date` text NOT NULL,
	`activity_type` text NOT NULL,
	`page_views` integer DEFAULT 0 NOT NULL,
	`total_time_seconds` integer DEFAULT 0 NOT NULL,
	`successful_generations` integer DEFAULT 0 NOT NULL,
	`failed_generations` integer DEFAULT 0 NOT NULL,
	`simulated` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "usage_recorded_date_format" CHECK("usage_metrics"."recorded_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "usage_activity_type" CHECK("usage_metrics"."activity_type" in ('wordle', 'wordsearch')),
	CONSTRAINT "usage_page_views" CHECK("usage_metrics"."page_views" >= 0 and typeof("usage_metrics"."page_views") = 'integer'),
	CONSTRAINT "usage_total_time" CHECK("usage_metrics"."total_time_seconds" >= 0 and typeof("usage_metrics"."total_time_seconds") = 'integer'),
	CONSTRAINT "usage_successful_generations" CHECK("usage_metrics"."successful_generations" >= 0 and typeof("usage_metrics"."successful_generations") = 'integer'),
	CONSTRAINT "usage_failed_generations" CHECK("usage_metrics"."failed_generations" >= 0 and typeof("usage_metrics"."failed_generations") = 'integer'),
	CONSTRAINT "usage_duration_shape" CHECK(("usage_metrics"."page_views" = 0 and "usage_metrics"."total_time_seconds" = 0) or ("usage_metrics"."page_views" > 0 and "usage_metrics"."total_time_seconds" >= "usage_metrics"."page_views")),
	CONSTRAINT "usage_simulated_boolean" CHECK("usage_metrics"."simulated" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usage_date_type_source` ON `usage_metrics` (`recorded_date`,`activity_type`,`simulated`);--> statement-breakpoint
CREATE INDEX `usage_recorded_date` ON `usage_metrics` (`recorded_date`);