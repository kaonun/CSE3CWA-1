import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

// Interactive browser QA uses disposable storage, never the teacher database.
const temporary = await mkdtemp(join(tmpdir(), "phonemele-preview-"));
const probe = createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = spawn(process.execPath, ["scripts/start-production.mjs"], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), windowsHide: true, stdio: ["ignore", "inherit", "inherit"],
  env: { ...process.env, DATABASE_PATH: join(temporary, "verification.db"), HOSTNAME: "127.0.0.1", PORT: String(port) },
});
console.log(`Isolated preview: http://127.0.0.1:${port}/library`);
console.log("Enter stop to close this verification server and remove only its temporary data.");
const input = createInterface({ input: process.stdin });
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  if (server.pid && server.exitCode === null && server.signalCode === null) { server.kill(); await once(server, "exit"); }
  input.close();
  assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
  assert.ok(temporary.includes("phonemele-preview-"));
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  console.log("Removed only the isolated preview's temporary database.");
}
input.on("line", (line) => { if (line.trim() === "stop") stop().catch((error) => { console.error(error); process.exitCode = 1; }); });
input.on("close", () => { if (!closing) stop(); });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", () => { if (!closing) stop(); });
server.on("error", (error) => { console.error(error); process.exitCode = 1; stop(); });
