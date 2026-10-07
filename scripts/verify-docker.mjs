import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const docker = process.env.DOCKER_BIN || "docker";
const image = "phonemele:assessment-2";
const name = `phonemele-verify-${randomUUID().slice(0, 8)}`;
const volume = `${name}-data`;
let created = false;
let volumeCreated = false;
let apiRecords;

async function capture(args) {
  return (await execute(docker, args, { cwd: root, windowsHide: true, timeout: 30000 })).stdout.trim();
}

async function run(command, args, env = process.env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, windowsHide: true, stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${signal || code}).`)));
  });
}

async function startContainer() {
  const id = await capture(["run", "--detach", "--init", "--name", name, "--publish", "127.0.0.1::3000", "--mount", `type=volume,source=${volume},target=/app/data`, image]);
  created = true;
  console.log(`Started verification container ${id.slice(0, 12)}.`);
  for (let i = 0; i < 90; i++) {
    const state = JSON.parse(await capture(["inspect", "--format", "{{json .State}}", name]));
    assert.ok(state.Running, "Verification container exited before becoming healthy");
    if (state.Health?.Status === "healthy") return;
    if (state.Health?.Status === "unhealthy") throw new Error("Container health check failed.");
    await delay(1000);
  }
  throw new Error("Container did not become healthy within 90 seconds");
}

async function fixture(phase) {
  // Inject test code only into our temporary container, not the production image.
  await capture(["cp", fileURLToPath(new URL("database-fixture.mjs", import.meta.url)), `${name}:/app/scripts/database-fixture.mjs`]);
  console.log(await capture(["exec", name, "node", "scripts/database-fixture.mjs", phase]));
}

async function baseUrl() {
  const binding = await capture(["port", name, "3000/tcp"]);
  assert.match(binding, /^127\.0\.0\.1:\d+$/);
  return `http://${binding}`;
}
async function backendChecks() {
  await run(process.execPath, ["scripts/verify-backend.mjs"], { ...process.env, TEST_BASE_URL: await baseUrl() });
}
async function apiRequest(path, method = "GET", body) {
  const response = await fetch(`${await baseUrl()}/api${path}`, {
    method, headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.equal(response.status, method === "POST" ? 201 : 200, JSON.stringify(result));
  return result.data;
}
async function writeApiRecords() {
  const list = await apiRequest("/word-lists", "POST", { title: "API persistence verification" });
  const word = await apiRequest(`/word-lists/${list.id}/words`, "POST", { phonemes: ["tʃ", "eː"], englishWord: "chair", hint: "Initial hint" });
  await apiRequest(`/words/${word.id}`, "PATCH", { hint: "Edited through API" });
  const wordle = await apiRequest("/configurations", "POST", { title: "Persistent Wordle", type: "wordle", wordListId: list.id, answerWordId: word.id, maxGuesses: 5, outputTheme: "dark", outputFilename: "saved-wordle.html" });
  const search = await apiRequest("/configurations", "POST", { title: "Persistent Search", type: "wordsearch", wordListId: list.id, gridSize: 8, difficulty: "hard" });
  apiRecords = { list, word, wordle, search };
  console.log("Created and edited persistence records through the running CRUD API.");
}
async function readApiRecords() {
  const list = await apiRequest(`/word-lists/${apiRecords.list.id}`);
  assert.equal(list.words.length, 1);
  assert.equal(list.words[0].id, apiRecords.word.id);
  assert.deepEqual(list.words[0].phonemes, ["tʃ", "eː"]);
  assert.equal(list.words[0].hint, "Edited through API");
  const wordle = await apiRequest(`/configurations/${apiRecords.wordle.id}`);
  assert.equal(wordle.maxGuesses, 5); assert.equal(wordle.outputTheme, "dark"); assert.equal(wordle.outputFilename, "saved-wordle.html");
  const search = await apiRequest(`/configurations/${apiRecords.search.id}`);
  assert.equal(search.gridSize, 8); assert.equal(search.difficulty, "hard");
  console.log("PASS API-created words, edits and both configuration types survive container replacement.");
}

try {
  console.log("Checking Docker engine and Compose configuration…");
  assert.equal(await capture(["info", "--format", "{{.OSType}}"]), "linux", "Use Docker's Linux container engine");
  await capture(["compose", "config", "--quiet"]);
  if (process.env.DOCKER_BUILD_CA_PEM) {
    await capture(["compose", "-f", "compose.yaml", "-f", "compose.trusted-ca.yaml", "config", "--quiet"]);
  }
  console.log("Building the production image…");
  const build = ["build", "--tag", image];
  if (process.env.DOCKER_BUILD_CA_PEM) build.push("--secret", "id=npm_ca,env=DOCKER_BUILD_CA_PEM");
  await run(docker, [...build, "."]);
  assert.equal(await capture(["run", "--rm", "--entrypoint", "node", image, "-e", "console.log(JSON.stringify(require('node:fs').readdirSync('/app/data')))"]), "[]", "Production image must not contain a host database");
  assert.equal(await capture(["run", "--rm", "--entrypoint", "node", image, "-e", "console.log(require('node:fs').existsSync('/app/scripts/database-fixture.mjs'))"]), "false", "Production image must not include the fixture writer");
  await capture(["volume", "create", "--label", `phonemele.verification=${name}`, volume]);
  volumeCreated = true;
  await startContainer();
  assert.notEqual(await capture(["exec", name, "id", "-u"]), "0", "Application must run as a non-root user");
  assert.equal(await capture(["exec", name, "node", "-e", "console.log(require('node:fs').existsSync('/run/secrets/npm_ca') || Boolean(process.env.NODE_EXTRA_CA_CERTS))"]), "false", "Build-only CA must not persist in the application container");
  console.log("Container is healthy and runs as a non-root user.");
  await backendChecks();
  await fixture("write");
  await writeApiRecords();
  await capture(["rm", "--force", name]);
  created = false;
  console.log("Recreating the container with the same owned test volume…");
  await startContainer();
  await fixture("read");
  await readApiRecords();
  await backendChecks();
  console.log("Docker build, database readiness, APIs and container-recreation persistence verified.");
} catch (error) {
  if (created) {
    try { console.error(await capture(["logs", name])); } catch { /* Preserve the original failure. */ }
  }
  throw error;
} finally {
  if (created) {
    await capture(["rm", "--force", name]);
    console.log("Removed the temporary verification container; the built image remains available.");
  }
  if (volumeCreated) {
    assert.equal(await capture(["volume", "inspect", "--format", '{{index .Labels "phonemele.verification"}}', volume]), name);
    await capture(["volume", "rm", volume]);
    console.log("Removed only the owned temporary verification volume and its fixture data.");
  }
}
