import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { openDatabase } from "../src/lib/db/connection.mjs";
import { readActivityConfiguration, readPhonemeTokens, readWordList, StoredPhonemeError } from "../src/lib/db/queries.mjs";
import { activityConfigurations, phonemes, wordLists, wordPhonemes, words } from "../src/lib/db/schema.mjs";

// Used only by verification against its own empty temporary database/volume.
// Refuse to write fixtures into any database that already contains teacher lists.
const connection = await openDatabase();
const { db, client } = connection;
let passed = 0;
async function check(name, action) {
  await action();
  passed++;
  console.log(`PASS database: ${name}`);
}
async function count(table) {
  return (await db.select({ count: sql`count(*)` }).from(table))[0].count;
}
async function rejectsConstraint(action) {
  await assert.rejects(action, (error) => /constraint|FOREIGN KEY/i.test(`${error.message} ${error.cause?.message}`));
}

const wordle = {
  id: "verify-wordle", wordListId: "verify-list", title: "Chair practice", type: "wordle",
  answerWordId: "verify-chair", maxGuesses: 4, showHints: false, outputTheme: "dark",
  outputFilename: "chair-practice.html",
};
const search = {
  id: "verify-search", wordListId: "verify-list", title: "Easy search", type: "wordsearch",
  gridSize: 8, difficulty: "easy", showHints: true,
};

try {
  if (process.argv[2] === "write") {
    assert.equal(await count(wordLists), 0, "Fixture writer requires an empty teacher database");
    await check("migrated schema, inventory and foreign keys are ready", async () => {
      assert.equal(await count(phonemes), 43);
      assert.equal((await client.execute("PRAGMA foreign_keys")).rows[0].foreign_keys, 1);
      assert.equal((await client.execute("PRAGMA journal_mode")).rows[0].journal_mode, "wal");
    });
    await check("store lists, words and ordered complete phoneme tokens atomically", async () => {
      await db.transaction(async (tx) => {
        await tx.insert(wordLists).values([
          { id: "verify-list", title: "Affricates and repeated tokens", description: "Fixture for persistence checks" },
          { id: "verify-other-list", title: "Other list" },
        ]);
        await tx.insert(words).values([
          { id: "verify-chair", wordListId: "verify-list", position: 0, englishWord: "chair", hint: "Something to sit on" },
          { id: "verify-jam", wordListId: "verify-list", position: 1, englishWord: "jam" },
          { id: "verify-repeat", wordListId: "verify-list", position: 2 },
          { id: "verify-cat", wordListId: "verify-other-list", position: 0, englishWord: "cat" },
        ]);
        // Deliberately insert tokens backwards to prove readers use positions.
        for (const [wordId, tokens] of [
          ["verify-chair", ["tʃ", "eː"]], ["verify-jam", ["dʒ", "æ", "m"]],
          ["verify-repeat", ["p", "p", "æɪ"]], ["verify-cat", ["k", "æ", "t"]],
        ]) {
          await tx.insert(wordPhonemes).values(tokens.map((symbol, position) => ({ wordId, symbol, position })).reverse());
        }
      });
    });
    await check("store multiple independent Wordle/Word Search configurations", async () => {
      await db.insert(activityConfigurations).values([
        wordle, search,
        { ...search, id: "verify-hard-search", title: "Hard search", difficulty: "hard", gridSize: 12, outputTheme: "dark" },
        { ...search, id: "verify-other-search", wordListId: "verify-other-list", title: "Other list search" },
      ]);
      assert.equal(await count(activityConfigurations), 4);
    });
    for (const [label, data] of [
      ["unknown activity type", { ...search, type: "other" }],
      ["invalid difficulty", { ...search, difficulty: "extreme" }],
      ["missing grid size", { ...search, gridSize: null }],
      ["fractional grid size", { ...search, gridSize: 7.5 }],
      ["invalid guess count", { ...wordle, maxGuesses: 9 }],
      ["missing Wordle answer", { ...wordle, answerWordId: null }],
      ["mixed activity settings", { ...wordle, gridSize: 8 }],
      ["unknown theme", { ...search, outputTheme: "other" }],
      ["unsafe output filename", { ...search, outputFilename: "../escape.html" }],
      ["answer from a different list", { ...wordle, answerWordId: "verify-cat" }],
    ]) {
      await check(`reject ${label}`, () => rejectsConstraint(() => db.insert(activityConfigurations).values({ ...data, id: `invalid-${label}` })));
    }
    await check("reject missing lists and duplicate word positions", async () => {
      await rejectsConstraint(() => db.insert(words).values({ wordListId: "missing", position: 0 }));
      await rejectsConstraint(() => db.insert(words).values({ wordListId: "verify-list", position: 0 }));
    });
    await check("reject duplicate, negative and excessive phoneme positions", async () => {
      for (const position of [0, -1, 15]) {
        await rejectsConstraint(() => db.insert(wordPhonemes).values({ wordId: "verify-chair", position, symbol: "p" }));
      }
    });
    await check("unsupported token rolls back the entire word write", async () => {
      await rejectsConstraint(() => db.transaction(async (tx) => {
        await tx.insert(words).values({ id: "invalid-word", wordListId: "verify-list", position: 3 });
        await tx.insert(wordPhonemes).values({ wordId: "invalid-word", position: 0, symbol: "NOT_IN_INVENTORY" });
      }));
      assert.equal((await db.select().from(words).where(eq(words.id, "invalid-word"))).length, 0);
    });
    await check("protect an answer referenced by a saved Wordle configuration", () => rejectsConstraint(() => db.delete(words).where(eq(words.id, "verify-chair"))));
    await check("deleting a list cascades only its owned records", async () => {
      await db.insert(wordLists).values({ id: "verify-delete-list", title: "Disposable list" });
      await db.insert(words).values({ id: "verify-delete-word", wordListId: "verify-delete-list", position: 0 });
      await db.insert(wordPhonemes).values({ wordId: "verify-delete-word", position: 0, symbol: "p" });
      await db.insert(activityConfigurations).values({ ...wordle, id: "verify-delete-activity", wordListId: "verify-delete-list", answerWordId: "verify-delete-word" });
      await db.delete(wordLists).where(eq(wordLists.id, "verify-delete-list"));
      assert.equal(await count(wordLists), 2);
      assert.equal(await count(words), 4);
      assert.equal(await count(wordPhonemes), 11);
      assert.equal(await count(activityConfigurations), 4);
    });
  } else if (process.argv[2] === "unready") {
    assert.equal(await count(wordLists), 0, "Failure fixture requires an empty teacher database");
    await db.delete(phonemes).where(eq(phonemes.symbol, "p"));
  } else if (process.argv[2] === "read") {
    await check("stored-token reader rejects missing, gapped, reordered and unknown phonemes", async () => {
      for (const rows of [[], [{ position: 1, symbol: "tʃ" }], [{ position: 0, symbol: "INVALID" }],
        [{ position: 1, symbol: "eː" }, { position: 0, symbol: "tʃ" }]]) {
        assert.throws(() => readPhonemeTokens(rows), StoredPhonemeError);
      }
      assert.deepEqual(readPhonemeTokens([{ position: 0, symbol: "tʃ" }, { position: 1, symbol: "eː" }]), ["tʃ", "eː"]);
    });
    await check("lists, token order, repeated tokens and hint metadata survive restart", async () => {
      const list = await readWordList(db, "verify-list");
      assert.equal(list.title, "Affricates and repeated tokens");
      assert.deepEqual(list.words.map((word) => word.phonemes), [["tʃ", "eː"], ["dʒ", "æ", "m"], ["p", "p", "æɪ"]]);
      assert.equal(list.words[0].englishWord, "chair");
      assert.equal(list.words[0].hint, "Something to sit on");
      assert.match(list.createdAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.ok(list.words.every((word) => word.id && word.createdAt && word.updatedAt));
    });
    await check("Wordle settings, hints and output settings survive restart", async () => {
      const stored = await readActivityConfiguration(db, "verify-wordle");
      for (const [key, value] of Object.entries(wordle)) assert.equal(stored[key], value, key);
      assert.deepEqual(stored.wordList.words[0].phonemes, ["tʃ", "eː"]);
    });
    await check("multiple configurations remain independent after restart", async () => {
      const easy = await readActivityConfiguration(db, "verify-search");
      const hard = await readActivityConfiguration(db, "verify-hard-search");
      const other = await readActivityConfiguration(db, "verify-other-search");
      assert.equal(easy.gridSize, 8);
      assert.equal(easy.difficulty, "easy");
      assert.equal(hard.gridSize, 12);
      assert.equal(hard.difficulty, "hard");
      assert.equal(hard.outputTheme, "dark");
      assert.equal(easy.wordList.id, hard.wordList.id);
      assert.deepEqual(other.wordList.words[0].phonemes, ["k", "æ", "t"]);
    });
    await check("missing records return null and foreign keys remain valid", async () => {
      assert.equal(await readWordList(db, "missing"), null);
      assert.equal(await readActivityConfiguration(db, "missing"), null);
      assert.equal((await client.execute("PRAGMA foreign_key_check")).rows.length, 0);
    });
  } else {
    throw new Error("Choose the write, read or unready fixture phase.");
  }
  console.log(`${passed} database checks passed (${process.argv[2]} phase).`);
} finally {
  connection.close();
}
