import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Runs on an isolated local app or the owned Docker verification container.
// If TEST_BASE_URL is used, only this new list is written and later deleted.
export async function runValidationChecks(base, check) {
  let list;
  async function request(path, method = "GET", body, status = 200, raw = false, headers = {}) {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: { "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, status, `${method} ${path}: expected ${status}, got ${response.status}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    if (status === 204) return null;
    const result = await response.json();
    if (status >= 400) {
      assert.deepEqual(Object.keys(result), ["error"]);
      assert.equal(typeof result.error.message, "string");
      assert.ok(result.error.message.length > 0);
      assert.doesNotMatch(result.error.message, /SELECT|INSERT|UPDATE|SQLITE|Libsql|stack|node_modules|[A-Z]:\\/);
    }
    return result;
  }
  try {
    list = (await request("/word-lists", "POST", { title: `Validation ${randomUUID()}` }, 201)).data;
    const word = (await request(`/word-lists/${list.id}/words`, "POST", {
      phonemes: ["tʃ", "eː", "æɪ", "tʃ"], englishWord: "Preserved word", hint: "Preserved hint",
    }, 201)).data;
    const configuration = (await request("/configurations", "POST", {
      title: "Preserved settings", type: "wordle", wordListId: list.id, answerWordId: word.id, maxGuesses: 4,
    }, 201)).data;

    await check("validation rejects every missing/malformed word payload before insertion", async () => {
      for (const body of [null, [], "tʃeː", {}, { phonemes: null }, { phonemes: [] }, { phonemes: "tʃeː" },
        { phonemes: [["tʃ"]] }, { phonemes: [12] }, { phonemes: [true] }, { phonemes: [""] },
        { phonemes: ["tʃ "] }, { phonemes: ["😀"] }, { phonemes: ["p", "INVALID"] },
        { phonemes: Array(16).fill("p") }, { phonemes: ["p"], hint: null }, { phonemes: ["p"], extra: true }]) {
        await request(`/word-lists/${list.id}/words`, "POST", body, 400);
      }
      assert.deepEqual((await request(`/word-lists/${list.id}`)).data, configuration.wordList);
    });
    await check("phoneme messages identify raw strings, length limits and the invalid token position", async () => {
      const path = `/words/${word.id}`;
      assert.match((await request(path, "PATCH", { phonemes: "tʃeː" }, 400)).error.message, /array.*not a raw string/);
      assert.match((await request(path, "PATCH", { phonemes: [] }, 400)).error.message, /1–15/);
      assert.match((await request(path, "PATCH", { phonemes: ["p", "INVALID"] }, 400)).error.message, /phoneme 2.*keyboard/);
    });
    await check("invalid edits preserve the whole word, metadata, list timestamps and saved settings", async () => {
      const before = (await request(`/configurations/${configuration.id}`)).data;
      for (const body of [{ phonemes: null, englishWord: "Not saved", hint: "Not saved" },
        { phonemes: ["p", null], hint: "Not saved" }, { phonemes: ["p"], englishWord: 12 },
        { phonemes: ["p"], hint: "x".repeat(301) }, { englishWord: "x".repeat(121) },
        { englishWord: "bad\u0000text" }, { hint: "\ud800" }, {}]) {
        await request(`/words/${word.id}`, "PATCH", body, 400);
        assert.deepEqual((await request(`/configurations/${configuration.id}`)).data, before);
      }
      for (const body of [{ title: " " }, { title: "Changed", maxGuesses: null }, { showHints: 0 },
        { answerWordId: null }, { outputFilename: "../../escape.html" }, { outputFilename: "bad.html\u0000" },
        { title: "\u0000" }, { title: "\ud800" }, { maxGuesses: "4" }, { difficulty: "hard" }, { unknown: true }, {}]) {
        await request(`/configurations/${configuration.id}`, "PATCH", body, 400);
        assert.deepEqual((await request(`/configurations/${configuration.id}`)).data, before);
      }
    });
    await check("invalid list updates leave existing titles, descriptions and timestamps unchanged", async () => {
      const before = (await request(`/word-lists/${list.id}`)).data;
      for (const body of [{ title: null }, { title: " " }, { title: "\u0000" }, { title: "\ud800" },
        { title: "Changed", description: null }, { description: "bad\u0000text" }, { description: "x".repeat(1001) }]) {
        await request(`/word-lists/${list.id}`, "PATCH", body, 400);
        assert.deepEqual((await request(`/word-lists/${list.id}`)).data, before);
      }
    });
    await check("configuration filter values cannot silently fall back when empty", async () => {
      for (const query of ["type=", "wordListId=", "limit=", "offset=", "limit=1e2", "offset=Infinity"]) {
        await request(`/configurations?${query}`, "GET", undefined, 400);
      }
    });
    await check("malformed JSON, missing bodies and invalid UTF-8 do not mutate stored words", async () => {
      const before = (await request(`/words/${word.id}`)).data;
      for (const body of ["", "{", '{"hint":"changed",}', '{"phonemes":',
        Buffer.from([0x7b, 0x22, 0x68, 0x69, 0x6e, 0x74, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d])]) {
        const result = await request(`/words/${word.id}`, "PATCH", body, 400, true);
        assert.match(result.error.message, /required|valid UTF-8 JSON/);
      }
      assert.deepEqual((await request(`/words/${word.id}`)).data, before);
    });
    await check("oversized chunked JSON without Content-Length is rejected by the stream bound", async () => {
      const response = await fetch(`${base}/api/words/${word.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, duplex: "half",
        body: (async function* () { yield '{"hint":"'; yield "x".repeat(17000); yield "x".repeat(17000); yield '"}'; })(),
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(response.status, 413);
      assert.match((await response.json()).error.message, /32 KB/);
      assert.deepEqual((await request(`/words/${word.id}`)).data, word);
    });
    await check("JSON media types are case insensitive and can include charset parameters", async () => {
      const result = await request(`/words/${word.id}`, "PATCH", { hint: "Validated UTF-8: tʃ eː æɪ" }, 200, false,
        { "Content-Type": "Application/JSON; charset=utf-8" });
      assert.equal(result.data.hint, "Validated UTF-8: tʃ eː æɪ");
      assert.deepEqual(result.data.phonemes, word.phonemes);
    });
    await check("temporary generation uses the same token validator and never returns partial HTML on invalid input", async () => {
      for (const answer of [null, [], "tʃeː", ["p", "INVALID"], [["p"]], [12], Array(16).fill("p")]) {
        await request("/activities/generate", "POST", { type: "wordle", theme: "light", config: { answer, englishWord: "", maxGuesses: 4, showHints: true } }, 400);
      }
      await request("/activities/generate", "POST", { type: "wordsearch", theme: "light", config: { words: [["p"], ["p", null]], size: 6, difficulty: "easy" } }, 400);
    });
    await check("missing or malformed record IDs return controlled errors without exposing internals", async () => {
      for (const path of ["/word-lists/%20", "/words/%3Cscript%3E", "/configurations/%20/generate"]) {
        await request(path, path.endsWith("generate") ? "POST" : "GET", path.endsWith("generate") ? {} : undefined, 400);
      }
      await request("/configurations/not-a-saved-record/generate", "POST", {}, 404);
    });
    await check("a rejected request does not poison subsequent saved generation or database readiness", async () => {
      const result = await request(`/configurations/${configuration.id}/generate`, "POST", {});
      assert.deepEqual(JSON.parse(result.data.html.match(/var CONFIG = (.*);/)[1]).answer, word.phonemes);
      assert.equal((await fetch(`${base}/health/database`)).status, 200);
    });
  } finally {
    if (list) await request(`/word-lists/${list.id}`, "DELETE", undefined, 204);
  }
}
