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
let created = false;

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
  const id = await capture(["run", "--detach", "--init", "--name", name, "--publish", "127.0.0.1::3000", image]);
  created = true;
  console.log(`Started verification container ${id.slice(0, 12)}.`);
  let healthy = false;
  for (let i = 0; i < 90; i++) {
    const state = JSON.parse(await capture(["inspect", "--format", "{{json .State}}", name]));
    assert.ok(state.Running, "Verification container exited before becoming healthy");
    if (state.Health?.Status === "healthy") { healthy = true; break; }
    if (state.Health?.Status === "unhealthy") throw new Error("Container health check failed.");
    await delay(1000);
  }
  assert.ok(healthy, "Container did not become healthy within 90 seconds");
  const binding = await capture(["port", name, "3000/tcp"]);
  assert.match(binding, /^127\.0\.0\.1:\d+$/);
  const base = `http://${binding}`;
  assert.notEqual(await capture(["exec", name, "id", "-u"]), "0", "Application must run as a non-root user");
  assert.equal(await capture(["exec", name, "node", "-e", "console.log(require('node:fs').existsSync('/run/secrets/npm_ca') || Boolean(process.env.NODE_EXTRA_CA_CERTS))"]), "false", "Build-only CA must not persist in the application container");
  console.log(`Container is healthy and runs as a non-root user. Testing ${base}…`);
  await run(process.execPath, ["scripts/verify-backend.mjs"], { ...process.env, TEST_BASE_URL: base });
  console.log("Docker build, health check, runtime user, browser assets, and activity APIs verified.");
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
}
