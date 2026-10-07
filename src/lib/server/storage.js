import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { activityConfigurations, wordLists, wordPhonemes, words } from "../db/schema.mjs";
import { readActivityConfiguration, readPhonemeTokens, readWordList } from "../db/queries.mjs";
import { withDatabase } from "./database";
import { ApiError } from "./http";
import { CONFIGURATION_FIELDS, identifier, objectFields, requireInput, validateConfiguration, validateList, validateWord } from "./storage-validation";

function found(record, label) {
  if (!record) throw new ApiError(404, `${label} was not found. It may have been deleted.`);
  return record;
}
const atomic = (action) => withDatabase((db) => db.transaction(action));
const now = () => new Date().toISOString();

async function listRecord(tx, id) {
  return found(await readWordList(tx, identifier(id)), "Word list");
}
async function wordRecord(tx, id) {
  const [word] = await tx.select().from(words).where(eq(words.id, identifier(id)));
  found(word, "Word");
  const tokens = await tx.select().from(wordPhonemes).where(eq(wordPhonemes.wordId, id)).orderBy(asc(wordPhonemes.position));
  return { ...word, phonemes: readPhonemeTokens(tokens) };
}
async function activityRecord(tx, id) {
  return found(await readActivityConfiguration(tx, identifier(id)), "Activity configuration");
}
async function touchList(tx, id) {
  await tx.update(wordLists).set({ updatedAt: now() }).where(eq(wordLists.id, id));
}
async function fitsSavedSearches(tx, listId, tokenCount) {
  const searches = await tx.select().from(activityConfigurations)
    .where(and(eq(activityConfigurations.wordListId, listId), eq(activityConfigurations.type, "wordsearch")));
  const tooSmall = searches.find((activity) => tokenCount > activity.gridSize);
  if (tooSmall) throw new ApiError(409, `This word is longer than the grid for “${tooSmall.title}”. Increase that saved grid size first.`);
}

export function listLists({ limit, offset }) {
  return atomic(async (tx) => {
    const data = await tx.select({
      id: wordLists.id, title: wordLists.title, description: wordLists.description,
      createdAt: wordLists.createdAt, updatedAt: wordLists.updatedAt,
    }).from(wordLists).orderBy(desc(wordLists.updatedAt), asc(wordLists.id)).limit(limit).offset(offset);
    // Aggregate only this page's IDs. Embedded correlated fields can lose table
    // qualification when Drizzle renders a single-table selection.
    const ids = data.map(({ id }) => id);
    const wordCounts = ids.length ? await tx.select({ id: words.wordListId, total: count() }).from(words)
      .where(inArray(words.wordListId, ids)).groupBy(words.wordListId) : [];
    const configurationCounts = ids.length ? await tx.select({ id: activityConfigurations.wordListId, total: count() }).from(activityConfigurations)
      .where(inArray(activityConfigurations.wordListId, ids)).groupBy(activityConfigurations.wordListId) : [];
    const wordTotals = new Map(wordCounts.map(({ id, total }) => [id, total]));
    const configurationTotals = new Map(configurationCounts.map(({ id, total }) => [id, total]));
    const [{ total }] = await tx.select({ total: sql`count(*)` }).from(wordLists);
    return { data: data.map((row) => ({ ...row, wordCount: wordTotals.get(row.id) || 0, configurationCount: configurationTotals.get(row.id) || 0 })), total, limit, offset };
  });
}
export const getList = (id) => atomic((tx) => listRecord(tx, id));
export function createList(input) {
  const values = validateList(input);
  return atomic(async (tx) => {
    const [list] = await tx.insert(wordLists).values(values).returning();
    return { ...list, words: [] };
  });
}
export function updateList(id, input) {
  const values = validateList(input, true);
  return atomic(async (tx) => {
    await listRecord(tx, id);
    await tx.update(wordLists).set(values).where(eq(wordLists.id, id));
    return listRecord(tx, id);
  });
}
export const deleteList = (id) => atomic(async (tx) => {
  await listRecord(tx, id);
  await tx.delete(wordLists).where(eq(wordLists.id, id));
});
export const getWord = (id) => atomic((tx) => wordRecord(tx, id));
export function createWord(listId, input) {
  const { phonemes, ...values } = validateWord(input);
  return atomic(async (tx) => {
    const list = await listRecord(tx, listId);
    if (list.words.length >= 30) throw new ApiError(409, "A list can contain up to 30 words. Remove a word or create another list.");
    await fitsSavedSearches(tx, listId, phonemes.length);
    const position = list.words.length ? Math.max(...list.words.map((word) => word.position)) + 1 : 0;
    const [word] = await tx.insert(words).values({ ...values, wordListId: listId, position }).returning();
    await tx.insert(wordPhonemes).values(phonemes.map((symbol, position) => ({ wordId: word.id, position, symbol })));
    await touchList(tx, listId);
    return { ...word, phonemes };
  });
}
export function updateWord(id, input) {
  const { phonemes, ...values } = validateWord(input, true);
  return atomic(async (tx) => {
    const word = await wordRecord(tx, id);
    if (phonemes) {
      await fitsSavedSearches(tx, word.wordListId, phonemes.length);
      await tx.delete(wordPhonemes).where(eq(wordPhonemes.wordId, id));
      await tx.insert(wordPhonemes).values(phonemes.map((symbol, position) => ({ wordId: id, position, symbol })));
    }
    await tx.update(words).set({ ...values, updatedAt: now() }).where(eq(words.id, id));
    await touchList(tx, word.wordListId);
    return wordRecord(tx, id);
  });
}
export const deleteWord = (id) => atomic(async (tx) => {
  const word = await wordRecord(tx, id);
  const [selected] = await tx.select({ id: activityConfigurations.id }).from(activityConfigurations)
    .where(eq(activityConfigurations.answerWordId, id)).limit(1);
  if (selected) throw new ApiError(409, "This word is a saved Wordle answer. Change or delete that configuration before deleting the word.");
  const list = await listRecord(tx, word.wordListId);
  const [search] = await tx.select({ id: activityConfigurations.id }).from(activityConfigurations)
    .where(and(eq(activityConfigurations.wordListId, word.wordListId), eq(activityConfigurations.type, "wordsearch"))).limit(1);
  if (list.words.length === 1 && search) throw new ApiError(409, "This list is used by a saved Word Search. Add another word or delete that configuration first.");
  await tx.delete(words).where(eq(words.id, id));
  await touchList(tx, word.wordListId);
});

export function listConfigurations({ limit, offset, wordListId, type }) {
  if (wordListId != null) identifier(wordListId, "Word list ID");
  if (type != null) requireInput(type === "wordle" || type === "wordsearch", "Choose Wordle or Word Search.");
  const filter = and(wordListId ? eq(activityConfigurations.wordListId, wordListId) : undefined,
    type ? eq(activityConfigurations.type, type) : undefined);
  return atomic(async (tx) => {
    if (wordListId) await listRecord(tx, wordListId);
    const data = await tx.select({
      id: activityConfigurations.id, title: activityConfigurations.title, type: activityConfigurations.type,
      wordListId: activityConfigurations.wordListId, listTitle: wordLists.title, updatedAt: activityConfigurations.updatedAt,
      createdAt: activityConfigurations.createdAt,
    }).from(activityConfigurations).innerJoin(wordLists, eq(activityConfigurations.wordListId, wordLists.id))
      .where(filter).orderBy(asc(activityConfigurations.createdAt), asc(activityConfigurations.id)).limit(limit).offset(offset);
    const [{ total }] = await tx.select({ total: sql`count(*)` }).from(activityConfigurations).where(filter);
    return { data, total, limit, offset };
  });
}
export const getConfiguration = (id) => atomic((tx) => activityRecord(tx, id));
async function checkConfigurationContent(tx, values) {
  const list = await listRecord(tx, values.wordListId);
  requireInput(list.words.length > 0, "Add at least one word before saving an activity configuration.");
  if (values.type === "wordle") {
    requireInput(list.words.some((word) => word.id === values.answerWordId), "Choose an answer from this word list.");
  } else {
    requireInput(list.words.every((word) => word.phonemes.length <= values.gridSize), "Every word must fit the selected grid size.");
  }
}
export function createConfiguration(input) {
  objectFields(input, CONFIGURATION_FIELDS);
  const values = validateConfiguration({ showHints: true, outputTheme: "light", outputFilename: `phonemele-${input.type}.html`, ...input });
  return atomic(async (tx) => {
    await checkConfigurationContent(tx, values);
    const [activity] = await tx.insert(activityConfigurations).values(values).returning();
    return activityRecord(tx, activity.id);
  });
}
export function updateConfiguration(id, input) {
  objectFields(input, CONFIGURATION_FIELDS, true);
  return atomic(async (tx) => {
    const current = await activityRecord(tx, id);
    requireInput(input.type === undefined || input.type === current.type, "Activity type cannot change. Create a new configuration instead.");
    requireInput(input.wordListId === undefined || input.wordListId === current.wordListId, "The saved word list cannot change. Create a new configuration instead.");
    const values = validateConfiguration({ ...current, ...input });
    await checkConfigurationContent(tx, values);
    await tx.update(activityConfigurations).set(values).where(eq(activityConfigurations.id, id));
    return activityRecord(tx, id);
  });
}
export const deleteConfiguration = (id) => atomic(async (tx) => {
  await activityRecord(tx, id);
  await tx.delete(activityConfigurations).where(eq(activityConfigurations.id, id));
});
