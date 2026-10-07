import { asc, eq } from "drizzle-orm";
import { activityConfigurations, wordLists, wordPhonemes, words } from "./schema.mjs";

// Storage readers return stable identities and token arrays to the service layer.
// Callers can supply a transaction when reading alongside related writes.
export async function readWordList(db, id) {
  const [list] = await db.select().from(wordLists).where(eq(wordLists.id, id));
  if (!list) return null;
  const rows = await db.select({ word: words, token: wordPhonemes })
    .from(words).leftJoin(wordPhonemes, eq(words.id, wordPhonemes.wordId))
    .where(eq(words.wordListId, id)).orderBy(asc(words.position), asc(wordPhonemes.position));
  const ordered = new Map();
  for (const { word, token } of rows) {
    if (!ordered.has(word.id)) ordered.set(word.id, { ...word, phonemes: [] });
    if (token) ordered.get(word.id).phonemes.push(token.symbol);
  }
  return { ...list, words: [...ordered.values()] };
}

export async function readActivityConfiguration(db, id) {
  const [activity] = await db.select().from(activityConfigurations).where(eq(activityConfigurations.id, id));
  if (!activity) return null;
  return { ...activity, wordList: await readWordList(db, activity.wordListId) };
}
