import assert from "node:assert/strict";
import { basename, dirname, resolve } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { openDatabase } from "../src/lib/db/connection.mjs";
import { activityConfigurations, phonemes, wordLists, wordPhonemes, words } from "../src/lib/db/schema.mjs";

// Deliberately bypass the API only inside verify-backend's private test DB.
// Refuse a default database, a teacher DB or an arbitrary DATABASE_PATH.
assert.ok(process.env.DATABASE_PATH, "Explicit verification database required");
const path = resolve(process.env.DATABASE_PATH);
assert.equal(basename(path), "verification.db");
assert.ok(basename(dirname(path)).startsWith("phonemele-backend-"));
const types = ["empty", "gap", "unknown"];
const ids = types.map((type) => `verify-corrupt-${type}`);
const connection = await openDatabase();
try {
  const { db } = connection;
  const existing = await db.select().from(wordLists);
  if (process.argv[2] === "prepare") {
    assert.equal(existing.length, 0, "Corruption fixture requires an empty teacher database");
    await db.transaction(async (tx) => {
      await tx.insert(phonemes).values({ symbol: "INVALID", label: "Fixture", example: "Fixture", type: "consonant", group: "Fixture" });
      for (const type of types) {
        const id = `verify-corrupt-${type}`;
        await tx.insert(wordLists).values({ id, title: "Owned corruption fixture" });
        await tx.insert(words).values({ id, wordListId: id, position: 0 });
        if (type !== "empty") await tx.insert(wordPhonemes).values({ wordId: id, position: type === "gap" ? 1 : 0, symbol: type === "unknown" ? "INVALID" : "tʃ" });
        await tx.insert(activityConfigurations).values({ id, title: "Owned corruption fixture", type: "wordle", wordListId: id, answerWordId: id, maxGuesses: 4 });
      }
    });
  } else if (process.argv[2] === "clean") {
    assert.ok(existing.every(({ id }) => ids.includes(id)), "Refuse to touch unrelated teacher content");
    await db.transaction(async (tx) => {
      await tx.delete(wordLists).where(inArray(wordLists.id, ids));
      await tx.delete(phonemes).where(eq(phonemes.symbol, "INVALID"));
    });
  } else { throw new Error("Choose prepare or clean."); }
} finally { connection.close(); }
