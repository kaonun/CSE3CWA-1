import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "phonemele-database-"));
const env = { ...process.env, DATABASE_PATH: join(temporary, "verification.db") };
async function run(script, args = []) {
  const { stdout, stderr } = await execute(process.execPath, [script, ...args], { cwd: root, env, windowsHide: true, timeout: 30000 });
  process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}
try {
  await run("scripts/migrate-database.mjs");
  await run("scripts/database-fixture.mjs", ["write"]);
  // A fresh process and another migration run must preserve teacher content.
  await run("scripts/migrate-database.mjs");
  await run("scripts/database-fixture.mjs", ["read"]);
  console.log("Empty-database migration, constraints, idempotent setup and process-restart persistence verified.");
} finally {
  assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
  assert.ok(temporary.includes("phonemele-database-"));
  await rm(temporary, { recursive: true, force: true });
  console.log("Removed only the verification script's temporary database directory.");
}
