import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();

const { stdout: status } = await execFileAsync("git", ["status", "--porcelain"], { cwd: projectRoot });
if (status.trim()) {
  throw new Error("Commit or discard outstanding files before creating the submission archive.");
}

const { stdout: commitOutput } = await execFileAsync("git", ["rev-parse", "--short=12", "HEAD"], { cwd: projectRoot });
const commit = commitOutput.trim();
const outputDirectory = path.join(projectRoot, "submission");
const outputPath = path.join(outputDirectory, `CSE3CWA-Assignment3-${commit}.zip`);

await mkdir(outputDirectory, { recursive: true });
await execFileAsync("git", ["archive", "--format=zip", `--output=${outputPath}`, "HEAD"], { cwd: projectRoot });

console.log(`Created ${outputPath}`);
console.log("The archive contains tracked source only, so node_modules, build output, local databases and test reports are excluded.");
