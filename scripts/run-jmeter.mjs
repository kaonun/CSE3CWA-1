import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const allowedStages = [1, 10, 25, 50, 100, 1000, 10000];
const stagesArgument = process.argv.find((argument) => argument.startsWith("--stages="));
const stages = (stagesArgument?.split("=")[1] || "1")
  .split(",")
  .map(Number);
const allowHighLoad = process.argv.includes("--allow-high-load");

if (!stages.length || stages.some((stage) => !allowedStages.includes(stage))) {
  throw new Error(`Choose comma-separated stages from: ${allowedStages.join(", ")}.`);
}
if (stages.some((stage) => stage > 100) && !allowHighLoad) {
  throw new Error("Stages above 100 users require --allow-high-load and an appropriately sized test environment.");
}

const baseURL = new URL(process.env.JMETER_BASE_URL || "http://127.0.0.1:3000");
if (baseURL.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(baseURL.hostname)) {
  throw new Error("JMETER_BASE_URL must be an explicitly authorised loopback HTTP target.");
}

// JMETER_BIN is reserved by JMeter itself for its bin directory.
const executable = process.env.JMETER_EXECUTABLE || "jmeter";
const plan = join(root, "jmeter", "phonemele-load.jmx");
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const resultRoot = join(root, "jmeter", "results", stamp);
await mkdir(resultRoot, { recursive: true });

function runJMeter(argumentsList) {
  return new Promise((resolve, reject) => {
    const batchFile = process.platform === "win32" && /\.(bat|cmd)$/i.test(executable);
    const command = batchFile ? (process.env.ComSpec || "cmd.exe") : executable;
    const commandArguments = batchFile
      ? ["/d", "/c", executable, ...argumentsList]
      : argumentsList;
    const child = spawn(command, commandArguments, {
      cwd: root,
      windowsHide: true,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", (error) => reject(new Error(
      `Unable to start JMeter. Install Apache JMeter 5.6.3 and set JMETER_EXECUTABLE when it is not on PATH. ${error.message}`,
    )));
    child.once("exit", (code) => code === 0
      ? resolve()
      : reject(new Error(`JMeter exited with code ${code}.`)));
  });
}

for (const users of stages) {
  const stage = join(resultRoot, `users-${users}`);
  const report = join(stage, "report");
  await mkdir(stage, { recursive: true });
  const rampSeconds = Math.max(1, Math.min(60, Math.ceil(users / 10)));
  console.log(`Running JMeter stage: ${users} users, ${rampSeconds}s ramp, ${process.env.JMETER_LOOPS || 1} loop(s).`);
  await runJMeter([
    "-n",
    "-t", plan,
    "-l", join(stage, "results.jtl"),
    "-j", join(stage, "jmeter.log"),
    "-e",
    "-o", report,
    `-Jhost=${baseURL.hostname.replaceAll("[", "").replaceAll("]", "")}`,
    `-Jport=${baseURL.port || "80"}`,
    `-Jusers=${users}`,
    `-Jramp_seconds=${rampSeconds}`,
    `-Jloops=${process.env.JMETER_LOOPS || 1}`,
    `-Jthink_ms=${process.env.JMETER_THINK_MS || 100}`,
  ]);
}

console.log(`JMeter results written to ${resultRoot}`);
