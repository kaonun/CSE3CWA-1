import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";

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
let offline = false;
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
async function stopServerOnly() {
  if (closing || offline) return;
  offline = true;
  if (server.exitCode === null && server.signalCode === null) { server.kill(); await once(server, "exit"); }
  console.log("Application server stopped. Generated offline files remain until you enter stop.");
}
input.on("line", (line) => {
  const action = line.trim() === "offline" ? stopServerOnly : line.trim() === "stop" ? stop : null;
  action?.().catch((error) => { console.error(error); process.exitCode = 1; });
});
input.on("close", () => { if (!closing) stop(); });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", () => { if (!closing && !offline) stop(); });
server.on("error", (error) => { console.error(error); process.exitCode = 1; stop(); });

if (process.env.PREVIEW_SAVED_FIXTURES === "1") {
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 120 && !closing; i++) {
      try { ready = (await fetch(`${base}/health/database`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Wait for our own server only. */ }
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, "Isolated preview did not become ready");
    const { seedSavedPreview } = await import("./saved-preview-fixture.mjs");
    await seedSavedPreview(base, temporary);
    console.log("Enter offline to stop the application while retaining exported test files for browser QA.");
  } catch (error) { console.error(error); process.exitCode = 1; await stop(); }
}
