import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "phonemele-playwright-"));
const database = join(temporary, "e2e.db");
let server;
let serverLog = "";
let exitCode = 1;

async function availablePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  await new Promise((resolveClose) => probe.close(resolveClose));
  return port;
}

try {
  const port = await availablePort();
  const baseURL = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["scripts/start-production.mjs"], {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      DATABASE_PATH: database,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
  });
  server.stdout.on("data", (data) => { serverLog += data; });
  server.stderr.on("data", (data) => { serverLog += data; });

  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`E2E server stopped during startup.\n${serverLog}`);
    try {
      const response = await fetch(`${baseURL}/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(250);
  }
  if (!ready) throw new Error(`E2E server did not become ready.\n${serverLog}`);

  const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
  const runner = spawn(process.execPath, [cli, "test", ...process.argv.slice(2)], {
    cwd: root,
    windowsHide: true,
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
  });
  [exitCode] = await once(runner, "exit");
} finally {
  if (server) {
    server.kill();
    if (server.exitCode === null) await once(server, "exit");
  }
  assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
  assert.ok(temporary.includes("phonemele-playwright-"));
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  console.log("Removed only Playwright's temporary database directory.");
}

process.exitCode = exitCode;
