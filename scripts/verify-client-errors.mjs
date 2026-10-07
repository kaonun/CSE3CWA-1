import assert from "node:assert/strict";
import { storageRequest } from "../src/lib/api/storage.js";
import { requestActivity } from "../src/lib/api/activities.js";

const originalFetch = globalThis.fetch;
let calls;
function mock(run) {
  calls = 0;
  globalThis.fetch = async (...args) => { calls++; return run(...args); };
}
let passed = 0;
async function check(name, run) {
  await run(); passed++; console.log(`PASS ${name}`);
}
try {
  await check("API errors retain the actionable server message", async () => {
    mock(() => Response.json({ error: { message: "A word must contain 1–15 complete phoneme tokens." } }, { status: 400 }));
    await assert.rejects(storageRequest("/word-lists"), /1–15/);
  });
  await check("HTML or broken JSON responses produce a friendly recovery message", async () => {
    for (const body of ["<html>Service unavailable</html>", "{", "null", "[]", "42", "{}"] ) {
      mock(() => new Response(body));
      await assert.rejects(storageRequest("/word-lists"), /unexpected response.*reload/i);
    }
  });
  await check("connection failures are clear and writes are not automatically retried", async () => {
    mock(() => { throw new TypeError("fetch failed"); });
    await assert.rejects(storageRequest("/word-lists", { method: "POST", body: { title: "Sample" } }), /Cannot reach the server/);
    assert.equal(calls, 1);
  });
  await check("timeouts warn about uncertain save status without retrying", async () => {
    mock(() => { throw new DOMException("Timed out", "TimeoutError"); });
    await assert.rejects(storageRequest("/word-lists", { method: "POST", body: { title: "Sample" } }), /Reload to check whether your change was saved/);
    assert.equal(calls, 1);
  });
  await check("cancelled navigation remains an abort, not a misleading service error", async () => {
    const controller = new AbortController(); controller.abort();
    const reason = new DOMException("Cancelled", "AbortError");
    mock(() => { throw reason; });
    await assert.rejects(storageRequest("/word-lists", { signal: controller.signal }), (error) => error === reason);
  });
  await check("successful reads, page metadata and empty deletes keep their API contract", async () => {
    mock(() => Response.json({ data: [], total: 0, limit: 50, offset: 0 }));
    assert.equal((await storageRequest("/word-lists")).total, 0);
    mock(() => new Response(null, { status: 204 }));
    assert.equal(await storageRequest("/word-lists/owned", { method: "DELETE" }), null);
  });
  await check("temporary builders also reject malformed or incomplete activity responses clearly", async () => {
    for (const result of [null, [], {}, { filename: 42, html: "..." }]) {
      mock(() => Response.json(result));
      await assert.rejects(requestActivity({ type: "wordle" }), /unexpected response/);
    }
    mock(() => Response.json({ filename: "test.html", html: "..." }));
    await assert.rejects(requestActivity({ type: "wordsearch" }), /unexpected response/);
  });
  await check("temporary generation preserves server errors and valid output contracts", async () => {
    mock(() => Response.json({ error: { message: "Select a complete phoneme." } }, { status: 400 }));
    await assert.rejects(requestActivity({ type: "wordle" }), /Select a complete phoneme/);
    const output = { filename: "test.html", html: "<html>...</html>" };
    mock(() => Response.json(output));
    assert.deepEqual(await requestActivity({ type: "wordle" }), output);
  });
  console.log(`\n${passed} client error checks passed.`);
} finally { globalThis.fetch = originalFetch; }
