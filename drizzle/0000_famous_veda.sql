CREATE TABLE `activity_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`word_list_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`answer_word_id` text,
	`max_guesses` integer,
	`grid_size` integer,
	`difficulty` text,
	`show_hints` integer DEFAULT true NOT NULL,
	`output_theme` text DEFAULT 'light' NOT NULL,
	`output_filename` text DEFAULT 'phonemele-activity.html' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`word_list_id`) REFERENCES `word_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`answer_word_id`,`word_list_id`) REFERENCES `words`(`id`,`word_list_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "activity_title_length" CHECK(length(trim("activity_configurations"."title")) between 1 and 120),
	CONSTRAINT "activity_type_settings" CHECK((
    "activity_configurations"."type" = 'wordle' and "activity_configurations"."answer_word_id" is not null and
    "activity_configurations"."max_guesses" is not null and typeof("activity_configurations"."max_guesses") = 'integer' and "activity_configurations"."max_guesses" between 3 and 8 and
    "activity_configurations"."grid_size" is null and "activity_configurations"."difficulty" is null
  ) or (
    "activity_configurations"."type" = 'wordsearch' and "activity_configurations"."answer_word_id" is null and "activity_configurations"."max_guesses" is null and
    "activity_configurations"."grid_size" is not null and typeof("activity_configurations"."grid_size") = 'integer' and "activity_configurations"."grid_size" between 6 and 15 and
    "activity_configurations"."difficulty" is not null and "activity_configurations"."difficulty" in ('easy', 'hard')
  )),
	CONSTRAINT "activity_hints_boolean" CHECK("activity_configurations"."show_hints" in (0, 1)),
	CONSTRAINT "activity_theme" CHECK("activity_configurations"."output_theme" in ('light', 'dark')),
	CONSTRAINT "activity_filename" CHECK(length("activity_configurations"."output_filename") between 6 and 120 and "activity_configurations"."output_filename" not glob '*[^a-zA-Z0-9_.-]*' and substr("activity_configurations"."output_filename", -5) = '.html')
);
--> statement-breakpoint
CREATE INDEX `activity_word_list` ON `activity_configurations` (`word_list_id`);--> statement-breakpoint
CREATE TABLE `phonemes` (
	`symbol` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`example` text NOT NULL,
	`type` text NOT NULL,
	`phoneme_group` text NOT NULL,
	CONSTRAINT "phoneme_symbol_length" CHECK(length("phonemes"."symbol") between 1 and 8),
	CONSTRAINT "phoneme_type" CHECK("phonemes"."type" in ('consonant', 'vowel'))
);
--> statement-breakpoint
CREATE TABLE `word_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "list_title_length" CHECK(length(trim("word_lists"."title")) between 1 and 120),
	CONSTRAINT "list_description_length" CHECK(length("word_lists"."description") <= 1000)
);
--> statement-breakpoint
CREATE TABLE `word_phonemes` (
	`word_id` text NOT NULL,
	`position` integer NOT NULL,
	`symbol` text NOT NULL,
	PRIMARY KEY(`word_id`, `position`),
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`symbol`) REFERENCES `phonemes`(`symbol`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "phoneme_position" CHECK("word_phonemes"."position" between 0 and 14 and typeof("word_phonemes"."position") = 'integer')
);
--> statement-breakpoint
CREATE INDEX `word_phoneme_symbol` ON `word_phonemes` (`symbol`);--> statement-breakpoint
CREATE TABLE `words` (
	`id` text PRIMARY KEY NOT NULL,
	`word_list_id` text NOT NULL,
	`position` integer NOT NULL,
	`english_word` text DEFAULT '' NOT NULL,
	`hint` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`word_list_id`) REFERENCES `word_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "word_position" CHECK("words"."position" >= 0 and typeof("words"."position") = 'integer'),
	CONSTRAINT "english_word_length" CHECK(length("words"."english_word") <= 120),
	CONSTRAINT "word_hint_length" CHECK(length("words"."hint") <= 300)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `word_list_position` ON `words` (`word_list_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `word_id_list` ON `words` (`id`,`word_list_id`);