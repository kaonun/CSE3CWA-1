import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Every run owns only its freshly created lists, even against a populated app.
export async function runCrudChecks(base, check) {
  const owned = new Set();
  async function request(path, method = "GET", body, expected = 200, headers = {}) {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: { "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
    });
    const result = response.status === 204 ? null : await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    if (expected >= 400) assert.ok(result.error.message.length > 0);
    return result;
  }
  async function newList(title) {
    const { data } = await request("/word-lists", "POST", { title }, 201);
    owned.add(data.id); return data;
  }
  const unique = randomUUID();
  let list, other, first, second, wordle, search, configurationOrder;
  try {
    await check("CRUD creates independent lists with stable identities", async () => {
      list = await newList(`CRUD ${unique}`); other = await newList(`Other ${unique}`);
      assert.notEqual(list.id, other.id); assert.deepEqual(list.words, []);
    });
    await check("CRUD paginated list summaries and input bounds", async () => {
      const page = await request("/word-lists?limit=1&offset=0");
      assert.equal(page.data.length, 1); assert.ok(page.total >= 2);
      assert.equal(page.limit, 1); assert.equal(page.offset, 0);
      for (const query of ["limit=101", "offset=-1", "limit=1.5"]) await request(`/word-lists?${query}`, "GET", undefined, 400);
    });
    await check("CRUD reads and updates list metadata", async () => {
      const { data } = await request(`/word-lists/${list.id}`, "PATCH", { title: `Edited ${unique}`, description: "Saved description" });
      assert.equal(data.id, list.id); assert.equal(data.description, "Saved description");
      assert.equal((await request(`/word-lists/${list.id}`)).data.title, `Edited ${unique}`);
    });
    await check("CRUD validates lists and rejects unknown or empty updates", async () => {
      for (const body of [null, [], {}, { title: " " }, { title: "x".repeat(121) }, { title: "Valid", id: "injected" }]) await request("/word-lists", "POST", body, 400);
      await request(`/word-lists/${list.id}`, "PATCH", {}, 400);
      await request(`/word-lists/${list.id}`, "PATCH", { description: 9 }, 400);
    });
    await check("CRUD creates words with ordered whole phonemes and hints", async () => {
      first = (await request(`/word-lists/${list.id}/words`, "POST", { phonemes: ["tʃ", "eː", "tʃ"], englishWord: "chair", hint: "A seat" }, 201)).data;
      second = (await request(`/word-lists/${list.id}/words`, "POST", { phonemes: ["dʒ", "æ", "m"], englishWord: "jam" }, 201)).data;
      assert.deepEqual(first.phonemes, ["tʃ", "eː", "tʃ"]); assert.equal(first.hint, "A seat"); assert.equal(second.hint, "");
      assert.deepEqual((await request(`/word-lists/${list.id}/words`)).data.map(({ id }) => id), [first.id, second.id]);
    });
    await check("CRUD updates word tokens atomically without changing identity", async () => {
      const updated = (await request(`/words/${first.id}`, "PATCH", { phonemes: ["tʃ", "eː"], hint: "Updated hint" })).data;
      assert.equal(updated.id, first.id); assert.equal(updated.englishWord, "chair"); assert.deepEqual(updated.phonemes, ["tʃ", "eː"]);
      assert.equal((await request(`/words/${first.id}`)).data.hint, "Updated hint");
    });
    await check("CRUD rejects malformed phonemes without partially replacing a word", async () => {
      for (const phonemes of ["tʃeː", [], ["INVALID"], [null], Array(16).fill("p")]) {
        await request(`/words/${first.id}`, "PATCH", { phonemes }, 400);
      }
      await request(`/words/${first.id}`, "PATCH", { hint: "x".repeat(301) }, 400);
      assert.deepEqual((await request(`/words/${first.id}`)).data.phonemes, ["tʃ", "eː"]);
      assert.equal((await request(`/word-lists/${list.id}`)).data.words.length, 2);
    });
    await check("CRUD stores multiple configurations for both activity types", async () => {
      wordle = (await request("/configurations", "POST", { title: "Wordle A", wordListId: list.id, type: "wordle", answerWordId: first.id, maxGuesses: 4, showHints: false, outputTheme: "dark", outputFilename: "chair.html" }, 201)).data;
      search = (await request("/configurations", "POST", { title: "Search A", wordListId: list.id, type: "wordsearch", gridSize: 6, difficulty: "easy" }, 201)).data;
      await request("/configurations", "POST", { title: "Wordle B", wordListId: list.id, type: "wordle", answerWordId: second.id, maxGuesses: 8 }, 201);
      await request("/configurations", "POST", { title: "Search B", wordListId: list.id, type: "wordsearch", gridSize: 15, difficulty: "hard" }, 201);
      assert.equal((await request(`/configurations?wordListId=${list.id}`)).total, 4);
      const summary = (await request("/word-lists?limit=100")).data.find(({ id }) => id === list.id);
      assert.equal(summary.wordCount, 2); assert.equal(summary.configurationCount, 4);
      assert.equal((await request(`/configurations?wordListId=${list.id}&type=wordle`)).total, 2);
      const page = await request(`/configurations?wordListId=${list.id}&limit=1&offset=1`);
      assert.equal(page.data.length, 1); assert.equal(page.total, 4);
      const stored = (await request(`/configurations/${wordle.id}`)).data;
      assert.equal(stored.outputFilename, "chair.html"); assert.equal(stored.showHints, false); assert.equal(stored.maxGuesses, 4);
      assert.deepEqual(stored.wordList.words[0].phonemes, ["tʃ", "eː"]);
    });
    await check("CRUD configurations are listed oldest first with stable pagination and type filtering", async () => {
      const rows = (await request(`/configurations?wordListId=${list.id}`)).data;
      assert.ok(rows.every(({ createdAt }) => typeof createdAt === "string"));
      const sorted = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      configurationOrder = rows.map(({ id }) => id);
      assert.deepEqual(configurationOrder, sorted.map(({ id }) => id));
      assert.equal(rows[0].createdAt, wordle.createdAt);
      const pages = await Promise.all(rows.map((_, offset) => request(`/configurations?wordListId=${list.id}&limit=1&offset=${offset}`)));
      assert.deepEqual(pages.flatMap(({ data }) => data.map(({ id }) => id)), configurationOrder);
      assert.deepEqual((await request(`/configurations?wordListId=${list.id}&type=wordle`)).data.map(({ id }) => id), rows.filter(({ type }) => type === "wordle").map(({ id }) => id));
      const linkedPage = await fetch(`${base}/library?activity=${wordle.id}`);
      assert.equal(linkedPage.status, 200);
      assert.ok((await linkedPage.text()).includes(wordle.id), "Library route must pass the linked configuration ID to its client workspace");
    });
    await check("CRUD validates configuration fields and cross-list answers", async () => {
      const template = { title: "Invalid", wordListId: list.id, type: "wordle", answerWordId: first.id, maxGuesses: 6 };
      for (const override of [{ wordListId: other.id }, { maxGuesses: 2 }, { maxGuesses: 3.5 }, { showHints: "false" }, { outputTheme: "other" }, { outputFilename: "../bad.html" }, { gridSize: 6 }, { answerWordId: "missing" }, { type: "other" }]) await request("/configurations", "POST", { ...template, ...override }, 400);
      await request(`/configurations/${wordle.id}`, "PATCH", { type: "wordsearch" }, 400);
      await request(`/configurations/${wordle.id}`, "PATCH", { wordListId: other.id }, 400);
      await request(`/configurations?type=other`, "GET", undefined, 400);
      assert.equal((await request(`/configurations?wordListId=${list.id}`)).total, 4);
    });
    await check("CRUD configuration updates preserve unrelated output settings", async () => {
      await request(`/configurations/${wordle.id}`, "PATCH", { title: "Revised Wordle", maxGuesses: 5 });
      const saved = (await request(`/configurations/${wordle.id}`)).data;
      assert.equal(saved.maxGuesses, 5); assert.equal(saved.outputTheme, "dark"); assert.equal(saved.outputFilename, "chair.html");
      await request(`/configurations/${search.id}`, "PATCH", { difficulty: "hard", gridSize: 8 });
      assert.equal((await request(`/configurations/${search.id}`)).data.difficulty, "hard");
    });
    await check("CRUD saving configurations preserves creation timestamps, positions and paginated order", async () => {
      const rows = (await request(`/configurations?wordListId=${list.id}`)).data;
      assert.deepEqual(rows.map(({ id }) => id), configurationOrder);
      assert.equal(rows.find(({ id }) => id === wordle.id).createdAt, wordle.createdAt);
      assert.equal(rows.find(({ id }) => id === search.id).createdAt, search.createdAt);
      await request(`/configurations/${rows.at(-1).id}`, "PATCH", { title: "Edited last without reordering" });
      assert.deepEqual((await request(`/configurations?wordListId=${list.id}`)).data.map(({ id }) => id), configurationOrder);
      const pages = await Promise.all(rows.map((_, offset) => request(`/configurations?wordListId=${list.id}&limit=1&offset=${offset}`)));
      assert.deepEqual(pages.flatMap(({ data }) => data.map(({ id }) => id)), configurationOrder);
    });
    await check("CRUD protects saved answers and grids from breaking word changes", async () => {
      await request(`/words/${first.id}`, "DELETE", undefined, 409);
      await request(`/words/${first.id}`, "PATCH", { phonemes: Array(9).fill("p") }, 409);
      await request(`/word-lists/${list.id}/words`, "POST", { phonemes: Array(9).fill("p") }, 409);
      assert.deepEqual((await request(`/words/${first.id}`)).data.phonemes, ["tʃ", "eː"]);
    });
    await check("CRUD deletes configurations then allows deleting unused words", async () => {
      await request(`/configurations/${wordle.id}`, "DELETE", undefined, 204);
      await request(`/configurations/${wordle.id}`, "GET", undefined, 404);
      await request(`/words/${first.id}`, "DELETE", undefined, 204);
      await request(`/words/${first.id}`, "GET", undefined, 404);
      assert.deepEqual((await request(`/word-lists/${list.id}`)).data.words.map(({ id }) => id), [second.id]);
    });
    await check("CRUD refuses an empty saved Word Search list", async () => {
      const configs = await request(`/configurations?wordListId=${list.id}&type=wordle`);
      for (const row of configs.data) await request(`/configurations/${row.id}`, "DELETE", undefined, 204);
      await request(`/words/${second.id}`, "DELETE", undefined, 409);
    });
    await check("CRUD concurrent writes and readiness do not collide on the connection", async () => {
      await Promise.all(Array.from({ length: 8 }, (_, i) => request(`/word-lists/${other.id}/words`, "POST", { phonemes: ["p", "p"], englishWord: `Concurrent ${i}` }, 201)).concat([
        fetch(`${base}/health/database`).then((response) => assert.equal(response.status, 200)), request(`/word-lists/${other.id}`),
      ]));
      const saved = (await request(`/word-lists/${other.id}`)).data.words;
      assert.equal(saved.length, 8); assert.equal(new Set(saved.map(({ position }) => position)).size, 8);
    });
    await check("CRUD enforces the 30-word list limit under concurrency", async () => {
      for (let i = 8; i < 29; i++) await request(`/word-lists/${other.id}/words`, "POST", { phonemes: ["p"] }, 201);
      const results = await Promise.all([1, 2].map(() => fetch(`${base}/api/word-lists/${other.id}/words`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phonemes: ["b"] }) })));
      assert.deepEqual(results.map(({ status }) => status).sort(), [201, 409]);
      assert.equal((await request(`/word-lists/${other.id}`)).data.words.length, 30);
    });
    await check("CRUD missing records return clear 404 responses", async () => {
      for (const path of ["/word-lists/missing", "/word-lists/missing/words", "/words/missing", "/configurations/missing"]) {
        await request(path, "GET", undefined, 404);
      }
      await request("/words/missing", "PATCH", { hint: "Missing" }, 404);
      await request("/configurations/missing", "DELETE", undefined, 404);
    });
    await check("CRUD rejects cross-site changes and accepts same-origin changes", async () => {
      await request(`/word-lists/${list.id}`, "PATCH", { description: "not saved" }, 403, { Origin: "https://other.example" });
      await request(`/word-lists/${list.id}`, "DELETE", undefined, 403, { "Sec-Fetch-Site": "cross-site" });
      await request(`/word-lists/${list.id}`, "PATCH", { description: "Same origin" }, 200, { Origin: base });
      assert.equal((await request(`/word-lists/${list.id}`)).data.description, "Same origin");
    });
    await check("CRUD rejects malformed, oversized and non-JSON write bodies", async () => {
      for (const [body, contentType, status] of [["{", "application/json", 400], [JSON.stringify({ title: "x".repeat(33000) }), "application/json", 413], ["{}", "text/plain", 415]]) {
        const response = await fetch(`${base}/api/word-lists`, { method: "POST", headers: { "Content-Type": contentType }, body });
        assert.equal(response.status, status); assert.ok((await response.json()).error.message);
      }
    });
    await check("CRUD list deletion cascades words and configurations safely", async () => {
      await request(`/word-lists/${list.id}`, "DELETE", undefined, 204); owned.delete(list.id);
      await request(`/words/${second.id}`, "GET", undefined, 404);
      await request(`/configurations/${search.id}`, "GET", undefined, 404);
      await request(`/word-lists/${list.id}`, "GET", undefined, 404);
      await request(`/word-lists/${other.id}`);
    });
  } finally {
    for (const id of owned) await request(`/word-lists/${id}`, "DELETE", undefined, 204);
  }
}
