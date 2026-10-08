import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Script } from "node:vm";
import { verifyOfflineActivity } from "./verify-offline.mjs";

export async function runSavedGenerationChecks(base, check) {
  const owned = new Set();
  async function request(path, method = "GET", body, status = 200) {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = response.status === 204 ? null : await response.json();
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    return result?.data;
  }
  async function newList(title) {
    const list = await request("/word-lists", "POST", { title }, 201);
    owned.add(list.id); return list;
  }
  const generate = (id) => request(`/configurations/${id}/generate`, "POST", {});
  const embedded = (html) => JSON.parse(html.match(/var CONFIG = (.*);/)[1]);
  let list, first, second, wordle, search, initialWordle, initialSearch;
  try {
    list = await newList(`Generation ${randomUUID()}`);
    first = await request(`/word-lists/${list.id}/words`, "POST", { phonemes: ["tʃ", "eː", "tʃ"], englishWord: "chair practice", hint: "A seat" }, 201);
    second = await request(`/word-lists/${list.id}/words`, "POST", { phonemes: ["dʒ", "æ", "m"], englishWord: "jam", hint: "A spread" }, 201);
    wordle = await request("/configurations", "POST", { title: "Stored Wordle", type: "wordle", wordListId: list.id, answerWordId: first.id, maxGuesses: 5, showHints: true, outputTheme: "dark", outputFilename: "stored-wordle.html" }, 201);
    search = await request("/configurations", "POST", { title: "Stored Search", type: "wordsearch", wordListId: list.id, gridSize: 8, difficulty: "easy", showHints: true, outputFilename: "stored-search.html" }, 201);
    await check("saved Wordle loads database answer, hints, guesses, title, theme and filename", async () => {
      initialWordle = await generate(wordle.id);
      assert.equal(initialWordle.filename, "stored-wordle.html");
      assert.match(initialWordle.html, /data-theme="dark"/);
      assert.match(initialWordle.html, /<title>Stored Wordle<\/title>/);
      assert.deepEqual(embedded(initialWordle.html), { answer: ["tʃ", "eː", "tʃ"], englishWord: "chair practice", maxGuesses: 5, showHints: true, hint: "A seat", title: "Stored Wordle" });
      assert.equal(initialWordle.configuration.id, wordle.id);
    });
    await check("saved Word Search preview/export share every placed word and its metadata", async () => {
      initialSearch = await generate(search.id);
      const config = embedded(initialSearch.html);
      assert.equal(initialSearch.filename, "stored-search.html");
      assert.deepEqual(config.grid, initialSearch.preview.grid);
      assert.deepEqual(config.placements, initialSearch.preview.placements);
      assert.deepEqual(initialSearch.preview.failed, []);
      assert.equal(config.grid.length, 8); assert.equal(config.placements.length, 2); assert.equal(config.showHints, true);
      for (const placement of config.placements) {
        const original = [first, second].find(({ id }) => id === placement.id);
        assert.deepEqual(placement.word, original.phonemes); assert.equal(placement.hint, original.hint);
        assert.ok((placement.dx === 1 && placement.dy === 0) || (placement.dx === 0 && placement.dy === 1));
        placement.word.forEach((token, i) => assert.equal(config.grid[placement.row + placement.dy * i][placement.col + placement.dx * i], token));
      }
    });
    await check("saved generation rejects client overrides, missing IDs and unsupported methods", async () => {
      for (const body of [{ theme: "light" }, { config: { answer: ["p"] } }, { wordListId: "missing" }, null]) await request(`/configurations/${wordle.id}/generate`, "POST", body, 400);
      await request("/configurations/missing/generate", "POST", {}, 404);
      await request("/configurations/bad%20id/generate", "POST", {}, 400);
      assert.equal((await fetch(`${base}/api/configurations/${wordle.id}/generate`)).status, 405);
      const rejected = await fetch(`${base}/api/configurations/${wordle.id}/generate`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://other.example" }, body: "{}" });
      assert.equal(rejected.status, 403);
      const tampered = await fetch(`${base}/api/activities/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "wordsearch", theme: "light", config: {
        words: [["p"]], size: 6, difficulty: "easy", showHints: true,
        wordMetadata: [{ id: "test", englishWord: "test", hint: "", word: ["INVALID"], row: -1 }],
      } }) });
      assert.equal(tampered.status, 400);
    });
    await check("regeneration uses edited stored words/settings without changing older snapshots", async () => {
      await request(`/words/${first.id}`, "PATCH", { phonemes: ["tʃ", "eː"], hint: "Edited seat" });
      await request(`/configurations/${wordle.id}`, "PATCH", { maxGuesses: 4, outputFilename: "revised.html" });
      const updated = await generate(wordle.id);
      assert.deepEqual(embedded(updated.html).answer, ["tʃ", "eː"]); assert.equal(embedded(updated.html).hint, "Edited seat");
      assert.equal(updated.filename, "revised.html"); assert.equal(embedded(updated.html).maxGuesses, 4);
      assert.deepEqual(embedded(initialWordle.html).answer, ["tʃ", "eː", "tʃ"]);
      assert.equal(embedded(initialWordle.html).maxGuesses, 5);
    });
    await check("another stored list drives distinct outputs rather than fixed examples", async () => {
      const other = await newList("Another saved list");
      const word = await request(`/word-lists/${other.id}/words`, "POST", { phonemes: ["æɪ", "æɪ"], englishWord: "new content" }, 201);
      for (const type of ["wordle", "wordsearch"]) {
        const activity = await request("/configurations", "POST", { title: `Other ${type}`, wordListId: other.id, type,
          ...(type === "wordle" ? { answerWordId: word.id, maxGuesses: 3 } : { gridSize: 6, difficulty: "hard" }) }, 201);
        const generated = await generate(activity.id);
        const config = embedded(generated.html);
        assert.deepEqual(type === "wordle" ? config.answer : config.placements[0].word, ["æɪ", "æɪ"]);
        assert.equal(generated.configuration.wordList.id, other.id);
      }
    });
    await check("duplicate token words retain independent IDs and hint metadata", async () => {
      const duplicate = await request(`/word-lists/${list.id}/words`, "POST", { phonemes: second.phonemes, englishWord: "duplicate jam", hint: "Different hint" }, 201);
      const generated = await generate(search.id);
      assert.equal(generated.preview.placements.length, 3);
      const repeated = generated.preview.placements.filter(({ word }) => JSON.stringify(word) === JSON.stringify(second.phonemes));
      assert.deepEqual(repeated.map(({ id }) => id).sort(), [second.id, duplicate.id].sort());
      assert.equal(repeated.find(({ id }) => id === duplicate.id).hint, "Different hint");
    });
    await check("stored hard difficulty and disabled hints reach the exported activity", async () => {
      await request(`/configurations/${search.id}`, "PATCH", { difficulty: "hard", showHints: false, outputTheme: "dark", gridSize: 10 });
      const generated = await generate(search.id);
      assert.equal(generated.preview.grid.length, 10); assert.equal(embedded(generated.html).showHints, false);
      assert.match(generated.html, /data-theme="dark"/); assert.equal(generated.configuration.difficulty, "hard");
      verifyOfflineActivity(generated.html);
      await request(`/configurations/${wordle.id}`, "PATCH", { showHints: false });
      const noHintsWordle = await generate(wordle.id);
      assert.equal(embedded(noHintsWordle.html).showHints, false);
      verifyOfflineActivity(noHintsWordle.html);
    });
    await check("saved generation safely serializes teacher text and escapes the HTML title", async () => {
      const injection = "</script><script>alert(1)</script>";
      await request(`/words/${second.id}`, "PATCH", { englishWord: injection, hint: injection });
      await request(`/configurations/${wordle.id}`, "PATCH", { answerWordId: second.id, title: injection });
      const generated = await generate(wordle.id);
      assert.ok(!generated.html.includes(injection)); assert.equal(embedded(generated.html).englishWord, injection);
      assert.equal(embedded(generated.html).hint, injection); assert.equal(embedded(generated.html).title, injection);
      const generatedSearch = await generate(search.id);
      assert.ok(!generatedSearch.html.includes(injection));
      assert.equal(embedded(generatedSearch.html).placements.find(({ id }) => id === second.id).hint, injection);
    });
    await check("saved exports are self-contained documents with syntactically valid runtimes", async () => {
      for (const output of [initialWordle, initialSearch]) {
        assert.match(output.html, /^<!DOCTYPE html>/); assert.match(output.html, /<style>/);
        assert.doesNotMatch(output.html, /<script[^>]+src=|<link[^>]+href=|\bfetch\(|XMLHttpRequest|\/api\//);
        new Script(output.html.match(/<script>([\s\S]*)<\/script>/)[1]);
      }
    });
    await check("concurrent saved generation leaves teacher content unchanged", async () => {
      const before = await request(`/word-lists/${list.id}`);
      await Promise.all([generate(wordle.id), generate(search.id), generate(wordle.id), fetch(`${base}/health/database`).then((r) => assert.equal(r.status, 200))]);
      assert.deepEqual(await request(`/word-lists/${list.id}`), before);
    });
    await check("offline saved Wordle runtime supports controls, repeated tokens, win/loss and reset", async () => {
      verifyOfflineActivity(initialWordle.html);
    });
    await check("offline saved Word Search runtime supports hints and finding every word", async () => {
      verifyOfflineActivity(initialSearch.html);
    });
    await check("unplaceable stored Word Search returns 422 without a partial download", async () => {
      const impossible = await newList("Unplaceable stored content");
      for (const symbol of ["p", "b", "t", "d", "k", "g", "m"]) await request(`/word-lists/${impossible.id}/words`, "POST", { phonemes: Array(6).fill(symbol) }, 201);
      const activity = await request("/configurations", "POST", { title: "Unplaceable", type: "wordsearch", wordListId: impossible.id, gridSize: 6, difficulty: "easy" }, 201);
      const response = await fetch(`${base}/api/configurations/${activity.id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      assert.equal(response.status, 422); const result = await response.json(); assert.equal(result.data, undefined); assert.equal(result.html, undefined);
      assert.match(result.error.message, /Could not fit every word/);
    });
    await check("deleted configurations cannot generate stale database content", async () => {
      await request(`/configurations/${wordle.id}`, "DELETE", undefined, 204);
      await request(`/configurations/${wordle.id}/generate`, "POST", {}, 404);
    });
  } finally {
    for (const id of owned) await request(`/word-lists/${id}`, "DELETE", undefined, 204);
  }
}
