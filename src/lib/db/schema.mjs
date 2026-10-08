import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(randomUUID);
const timestamps = () => ({
  createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`).$onUpdate(() => new Date().toISOString()),
});

// Inventory symbols are complete strings, including multi-character IPA tokens.
export const phonemes = sqliteTable("phonemes", {
  symbol: text("symbol").primaryKey(),
  label: text("label").notNull(),
  example: text("example").notNull(),
  type: text("type").notNull(),
  group: text("phoneme_group").notNull(),
}, (t) => [
  check("phoneme_symbol_length", sql`length(${t.symbol}) between 1 and 8`),
  check("phoneme_type", sql`${t.type} in ('consonant', 'vowel')`),
]);

export const wordLists = sqliteTable("word_lists", {
  id: id(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  ...timestamps(),
}, (t) => [
  check("list_title_length", sql`length(trim(${t.title})) between 1 and 120`),
  check("list_description_length", sql`length(${t.description}) <= 1000`),
]);

export const words = sqliteTable("words", {
  id: id(),
  wordListId: text("word_list_id").notNull().references(() => wordLists.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  englishWord: text("english_word").notNull().default(""),
  hint: text("hint").notNull().default(""),
  ...timestamps(),
}, (t) => [
  uniqueIndex("word_list_position").on(t.wordListId, t.position),
  uniqueIndex("word_id_list").on(t.id, t.wordListId),
  check("word_position", sql`${t.position} >= 0 and typeof(${t.position}) = 'integer'`),
  check("english_word_length", sql`length(${t.englishWord}) <= 120`),
  check("word_hint_length", sql`length(${t.hint}) <= 300`),
]);

export const wordPhonemes = sqliteTable("word_phonemes", {
  wordId: text("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  symbol: text("symbol").notNull().references(() => phonemes.symbol, { onDelete: "restrict" }),
}, (t) => [
  primaryKey({ columns: [t.wordId, t.position] }),
  index("word_phoneme_symbol").on(t.symbol),
  check("phoneme_position", sql`${t.position} between 0 and 14 and typeof(${t.position}) = 'integer'`),
]);

// A list can drive many independent configurations. Type-specific values remain
// explicit columns rather than unvalidated JSON blobs. Wordle selects one word.
export const activityConfigurations = sqliteTable("activity_configurations", {
  id: id(),
  wordListId: text("word_list_id").notNull().references(() => wordLists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  answerWordId: text("answer_word_id"),
  maxGuesses: integer("max_guesses"),
  gridSize: integer("grid_size"),
  difficulty: text("difficulty"),
  showHints: integer("show_hints", { mode: "boolean" }).notNull().default(true),
  outputTheme: text("output_theme").notNull().default("light"),
  outputFilename: text("output_filename").notNull().default("phonemele-activity.html"),
  ...timestamps(),
}, (t) => [
  index("activity_word_list").on(t.wordListId),
  foreignKey({ columns: [t.answerWordId, t.wordListId], foreignColumns: [words.id, words.wordListId], name: "answer_belongs_to_list" }).onDelete("no action"),
  check("activity_title_length", sql`length(trim(${t.title})) between 1 and 120`),
  check("activity_type_settings", sql`(
    ${t.type} = 'wordle' and ${t.answerWordId} is not null and
    ${t.maxGuesses} is not null and typeof(${t.maxGuesses}) = 'integer' and ${t.maxGuesses} between 3 and 8 and
    ${t.gridSize} is null and ${t.difficulty} is null
  ) or (
    ${t.type} = 'wordsearch' and ${t.answerWordId} is null and ${t.maxGuesses} is null and
    ${t.gridSize} is not null and typeof(${t.gridSize}) = 'integer' and ${t.gridSize} between 6 and 15 and
    ${t.difficulty} is not null and ${t.difficulty} in ('easy', 'hard')
  )`),
  check("activity_hints_boolean", sql`${t.showHints} in (0, 1)`),
  check("activity_theme", sql`${t.outputTheme} in ('light', 'dark')`),
  check("activity_filename", sql`length(${t.outputFilename}) between 6 and 120 and ${t.outputFilename} not glob '*[^a-zA-Z0-9_.-]*' and substr(${t.outputFilename}, -5) = '.html'`),
]);

// Reporting records are daily activity-type aggregates. Keeping the underlying
// counts and total duration allows the dashboard to calculate rates and averages
// rather than storing values that can become inconsistent with one another.
export const usageMetrics = sqliteTable("usage_metrics", {
  id: id(),
  recordedDate: text("recorded_date").notNull(),
  activityType: text("activity_type").notNull(),
  pageViews: integer("page_views").notNull().default(0),
  totalTimeSeconds: integer("total_time_seconds").notNull().default(0),
  successfulGenerations: integer("successful_generations").notNull().default(0),
  failedGenerations: integer("failed_generations").notNull().default(0),
  simulated: integer("simulated", { mode: "boolean" }).notNull().default(true),
  ...timestamps(),
}, (t) => [
  uniqueIndex("usage_date_type_source").on(t.recordedDate, t.activityType, t.simulated),
  index("usage_recorded_date").on(t.recordedDate),
  check("usage_recorded_date_format", sql`${t.recordedDate} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
  check("usage_activity_type", sql`${t.activityType} in ('wordle', 'wordsearch')`),
  check("usage_page_views", sql`${t.pageViews} >= 0 and typeof(${t.pageViews}) = 'integer'`),
  check("usage_total_time", sql`${t.totalTimeSeconds} >= 0 and typeof(${t.totalTimeSeconds}) = 'integer'`),
  check("usage_successful_generations", sql`${t.successfulGenerations} >= 0 and typeof(${t.successfulGenerations}) = 'integer'`),
  check("usage_failed_generations", sql`${t.failedGenerations} >= 0 and typeof(${t.failedGenerations}) = 'integer'`),
  check("usage_duration_shape", sql`(${t.pageViews} = 0 and ${t.totalTimeSeconds} = 0) or (${t.pageViews} > 0 and ${t.totalTimeSeconds} >= ${t.pageViews})`),
  check("usage_simulated_boolean", sql`${t.simulated} in (0, 1)`),
]);
