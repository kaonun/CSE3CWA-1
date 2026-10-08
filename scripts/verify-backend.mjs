import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { runCrudChecks } from "./crud-checks.mjs";
import { runSavedGenerationChecks } from "./saved-generation-checks.mjs";
import { runValidationChecks } from "./validation-checks.mjs";

// Exercise the built application over HTTP, using only Node's standard library.
// The temporary server binds to loopback and is always stopped on completion.
const root = fileURLToPath(new URL("../", import.meta.url));
let server;
let temporary;
let base = process.env.TEST_BASE_URL?.replace(/\/$/, "");
if (base) {
  const url = new URL(base);
  assert.ok(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    "TEST_BASE_URL must be a loopback HTTP URL for the local test app.");
} else {
  temporary = await mkdtemp(join(tmpdir(), "phonemele-backend-"));
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["scripts/start-production.mjs"], {
    cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    // Relative input catches standalone's cwd change: startup must resolve it
    // before migration/server boot rather than opening two different files.
    env: { ...process.env, DATABASE_PATH: relative(root, join(temporary, "verification.db")), HOSTNAME: "127.0.0.1", PORT: String(port) },
  });
}
let log = "";
server?.stdout.on("data", (data) => { log += data; });
server?.stderr.on("data", (data) => { log += data; });
let passed = 0;

async function check(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

async function post(body, options = {}) {
  const response = await fetch(`${base}/api/activities/generate`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000), ...options,
  });
  const data = await response.json();
  assert.equal(response.headers.get("cache-control"), "no-store");
  return { response, data };
}

function embeddedConfig(html) {
  return JSON.parse(html.match(/var CONFIG = (.*);/)[1]);
}

const wordle = {
  type: "wordle", theme: "dark",
  config: { answer: ["tʃ", "eː"], englishWord: "chair", maxGuesses: 4, showHints: false },
};
const wordsearch = {
  type: "wordsearch", theme: "light",
  config: { words: [["tʃ", "eː"], ["dʒ", "æ", "m"]], size: 8, difficulty: "easy" },
};

try {
  if (server) {
    for (let i = 0; i < 120 && !log.includes("Ready in"); i++) {
      if (server.exitCode !== null) throw new Error(log);
      await delay(250);
    }
    assert.ok(log.includes("Ready in"), `Server did not start: ${log}`);
  }

  await check("health returns 200 and identifies the service", async () => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok", service: "phonemele" });
  });
  await check("database readiness returns 200 after migrations and inventory seed", async () => {
    const response = await fetch(`${base}/health/database`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok", database: "sqlite" });
  });
  await check("all existing frontend routes still render", async () => {
    for (const route of ["/", "/wordle", "/wordsearch", "/library", "/dashboard", "/about", "/settings"]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /Phoneme/);
    }
  });
  await check("dashboard renders persisted reporting aggregates", async () => {
    const response = await fetch(`${base}/dashboard`);
    assert.equal(response.status, 200);
    const page = await response.text();
    assert.match(page, /251/);
    assert.match(page, /10 failed generations/);
    assert.match(page, /Persisted sample/);
  });
  await check("production browser scripts and styles are served", async () => {
    const page = await (await fetch(`${base}/wordle`)).text();
    const paths = new Set([...page.matchAll(/(?:src|href)="([^"\s]*\/_next\/static\/[^"\s]+)"/g)].map((match) => match[1]));
    assert.ok(paths.size > 0, "Expected production browser assets in rendered HTML");
    for (const path of paths) {
      const response = await fetch(new URL(path, base));
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get("content-type"), /javascript|text\/css/i, path);
      assert.ok((await response.text()).length > 0, path);
    }
  });
  await check("Wordle preserves multi-character tokens, settings and theme", async () => {
    const { response, data } = await post(wordle);
    assert.equal(response.status, 200);
    assert.equal(data.filename, "phonemele-wordle.html");
    assert.deepEqual(embeddedConfig(data.html), wordle.config);
    assert.match(data.html, /data-theme="dark"/);
    assert.doesNotMatch(data.html, /<script[^>]+src=/);
  });
  await check("teacher text cannot break out of the exported script", async () => {
    const text = "</script><script>alert(1)</script>";
    const { data } = await post({ ...wordle, config: { ...wordle.config, englishWord: text } });
    assert.ok(!data.html.includes(text));
    assert.equal(embeddedConfig(data.html).englishWord, text);
  });
  for (const difficulty of ["easy", "hard"]) {
    await check(`Word Search ${difficulty}: complete placement and matching preview/export`, async () => {
      const input = { ...wordsearch, config: { ...wordsearch.config, difficulty } };
      const { response, data } = await post(input);
      assert.equal(response.status, 200);
      assert.equal(data.filename, "phonemele-wordsearch.html");
      assert.equal(data.preview.grid.length, 8);
      assert.ok(data.preview.grid.every((row) => row.length === 8));
      assert.equal(data.preview.placements.length, 2);
      assert.deepEqual(data.preview.failed, []);
      assert.deepEqual(embeddedConfig(data.html), { grid: data.preview.grid, placements: data.preview.placements });
      for (const placement of data.preview.placements) {
        if (difficulty === "easy") assert.ok((placement.dx === 1 && placement.dy === 0) || (placement.dx === 0 && placement.dy === 1));
        placement.word.forEach((token, i) => assert.equal(data.preview.grid[placement.row + placement.dy * i][placement.col + placement.dx * i], token));
      }
    });
  }
  const invalid = [
    ["missing activity", null],
    ["unknown activity type", { ...wordle, type: "other" }],
    ["invalid theme", { ...wordle, theme: "other" }],
    ["missing configuration", { type: "wordle", theme: "light" }],
    ["raw phoneme string", { ...wordle, config: { ...wordle.config, answer: "tʃeː" } }],
    ["unknown phoneme", { ...wordle, config: { ...wordle.config, answer: ["INVALID"] } }],
    ["empty phoneme array", { ...wordle, config: { ...wordle.config, answer: [] } }],
    ["fractional guess count", { ...wordle, config: { ...wordle.config, maxGuesses: 4.5 } }],
    ["out-of-range guess count", { ...wordle, config: { ...wordle.config, maxGuesses: 9 } }],
    ["non-boolean hints", { ...wordle, config: { ...wordle.config, showHints: "false" } }],
    ["invalid English text", { ...wordle, config: { ...wordle.config, englishWord: 123 } }],
    ["empty word list", { ...wordsearch, config: { ...wordsearch.config, words: [] } }],
    ["invalid grid size", { ...wordsearch, config: { ...wordsearch.config, size: 16 } }],
    ["invalid difficulty", { ...wordsearch, config: { ...wordsearch.config, difficulty: "extreme" } }],
    ["word longer than grid", { ...wordsearch, config: { ...wordsearch.config, words: [Array(9).fill("p")] } }],
  ];
  for (const [name, input] of invalid) {
    await check(`400 for ${name}`, async () => {
      const { response, data } = await post(input);
      assert.equal(response.status, 400);
      assert.equal(typeof data.error.message, "string");
      assert.ok(data.error.message.length > 0);
      assert.equal(data.html, undefined);
    });
  }
  await check("malformed JSON returns 400", async () => {
    assert.equal((await post(null, { body: "{" })).response.status, 400);
  });
  await check("unsupported content type returns 415", async () => {
    assert.equal((await post(wordle, { headers: { "Content-Type": "text/plain" } })).response.status, 415);
  });
  await check("oversized payload returns 413", async () => {
    assert.equal((await post({ text: "x".repeat(33000) })).response.status, 413);
  });
  await check("incomplete puzzle returns 422 without a partial export", async () => {
    const words = ["p", "b", "t", "d", "k", "g", "m"].map((symbol) => Array(6).fill(symbol));
    const { response, data } = await post({ ...wordsearch, config: { words, size: 6, difficulty: "easy" } });
    assert.equal(response.status, 422);
    assert.equal(data.html, undefined);
  });
  await check("generation endpoint rejects GET", async () => {
    assert.equal((await fetch(`${base}/api/activities/generate`)).status, 405);
  });
  await runCrudChecks(base, check);
  await runSavedGenerationChecks(base, check);
  await runValidationChecks(base, check);
  if (temporary) {
    await check("damaged saved phonemes return safe 503s instead of shortened answers or broken UI data", async () => {
      const fixture = (phase) => promisify(execFile)(process.execPath, ["scripts/corrupt-phoneme-fixture.mjs", phase], {
        cwd: root, windowsHide: true, timeout: 10000,
        env: { ...process.env, DATABASE_PATH: join(temporary, "verification.db") },
      });
      try {
        await fixture("prepare");
        for (const type of ["empty", "gap", "unknown"]) {
          const id = `verify-corrupt-${type}`;
          for (const path of [`/word-lists/${id}`, `/word-lists/${id}/words`, `/words/${id}`, `/configurations/${id}`, `/configurations/${id}/generate`]) {
            const generation = path.endsWith("/generate");
            const response = await fetch(`${base}/api${path}`, {
              method: generation ? "POST" : "GET", headers: { "Content-Type": "application/json" },
              ...(generation ? { body: "{}" } : {}), signal: AbortSignal.timeout(10000),
            });
            assert.equal(response.status, 503, path);
            assert.equal(response.headers.get("cache-control"), "no-store");
            const result = await response.json();
            assert.deepEqual(result, { error: { message: "Saved phoneme data is incomplete or invalid. Check the database setup or restore a known-good backup." } });
          }
          assert.equal((await fetch(`${base}/health`)).status, 200);
        }
      } finally { await fixture("clean"); }
      assert.equal((await fetch(`${base}/health/database`)).status, 200);
    });
    await check("database failure reports 503 without affecting application liveness", async () => {
      // A separate process avoids retaining Windows native-driver file handles
      // in the test runner. Only its own isolated database is changed.
      await promisify(execFile)(process.execPath, ["scripts/database-fixture.mjs", "unready"], {
        cwd: root, windowsHide: true, timeout: 10000,
        env: { ...process.env, DATABASE_PATH: join(temporary, "verification.db") },
      });
      const response = await fetch(`${base}/health/database`);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { status: "unavailable", message: "Database is not ready. Check the server setup." });
      assert.equal((await fetch(`${base}/health`)).status, 200);
    });
  }
  console.log(`\n${passed} backend checks passed.`);
} finally {
  if (server) {
    server.kill();
    if (server.exitCode === null) await once(server, "exit");
  }
  if (temporary) {
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(temporary.includes("phonemele-backend-"));
    await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
