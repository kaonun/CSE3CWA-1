import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const pages = [
  { name: "Dashboard", slug: "dashboard", pathname: "/dashboard" },
  { name: "Library", slug: "library", pathname: "/library" },
  { name: "Wordle", slug: "wordle", pathname: "/wordle" },
  { name: "Word Search", slug: "wordsearch", pathname: "/wordsearch" },
];

const baseUrl = new URL(process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:3000");
const allowedHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

if (!allowedHosts.has(baseUrl.hostname) || !["http:", "https:"].includes(baseUrl.protocol)) {
  throw new Error("LIGHTHOUSE_BASE_URL must target a loopback HTTP(S) server.");
}

const minimumScore = Number(process.env.LIGHTHOUSE_MIN_SCORE ?? 100);
if (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 100) {
  throw new Error("LIGHTHOUSE_MIN_SCORE must be a number from 0 to 100.");
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.platform === "win32" && path.join(process.env.ProgramFiles ?? "", "Google", "Chrome", "Application", "chrome.exe"),
  process.platform === "win32" && path.join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  process.platform === "darwin" && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  process.platform === "linux" && "/usr/bin/google-chrome",
  process.platform === "linux" && "/usr/bin/chromium",
].filter(Boolean);

let chromePath;
for (const candidate of chromeCandidates) {
  try {
    await access(candidate);
    chromePath = candidate;
    break;
  } catch {
    // Try the next known browser location.
  }
}

if (!chromePath) {
  throw new Error("Chrome or Edge was not found. Set CHROME_PATH to its executable.");
}

const healthResponse = await fetch(new URL("/health", baseUrl));
if (!healthResponse.ok) {
  throw new Error(`The local application is not healthy (${healthResponse.status}). Start it before running Lighthouse.`);
}

const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const outputDirectory = path.join(process.cwd(), "lighthouse", "results", timestamp);
await mkdir(outputDirectory, { recursive: true });

const lighthouseCli = path.join(process.cwd(), "node_modules", "lighthouse", "cli", "index.js");

function runLighthouse(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [lighthouseCli, ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Lighthouse exited with code ${code}.`));
    });
  });
}

const summaries = [];
for (const page of pages) {
  const pageUrl = new URL(page.pathname, baseUrl).href;
  const outputBase = path.join(outputDirectory, page.slug);
  await runLighthouse([
    pageUrl,
    "--only-categories=accessibility",
    "--output=json",
    "--output=html",
    `--output-path=${outputBase}`,
    `--chrome-path=${chromePath}`,
    "--chrome-flags=--headless --no-sandbox",
    "--quiet",
  ]);

  const report = JSON.parse(await readFile(`${outputBase}.report.json`, "utf8"));
  const score = Math.round(report.categories.accessibility.score * 100);
  const failedAudits = report.categories.accessibility.auditRefs
    .map(({ id }) => report.audits[id])
    .filter((audit) => audit.score === 0 && audit.scoreDisplayMode !== "notApplicable")
    .map((audit) => audit.title);

  summaries.push({ ...page, score, failedAudits });
}

const csv = [
  "page,url,accessibility_score,failed_automated_audits",
  ...summaries.map((summary) => [
    JSON.stringify(summary.name),
    JSON.stringify(new URL(summary.pathname, baseUrl).href),
    summary.score,
    summary.failedAudits.length,
  ].join(",")),
].join("\n");

await writeFile(path.join(outputDirectory, "summary.csv"), `${csv}\n`, "utf8");
await writeFile(path.join(outputDirectory, "summary.json"), `${JSON.stringify(summaries, null, 2)}\n`, "utf8");

console.table(summaries.map(({ name, score, failedAudits }) => ({
  page: name,
  accessibility: score,
  failedAudits: failedAudits.length,
})));
console.log(`HTML, JSON and CSV evidence: ${outputDirectory}`);

const belowThreshold = summaries.filter((summary) => summary.score < minimumScore);
if (belowThreshold.length > 0) {
  throw new Error(`Accessibility score below ${minimumScore}: ${belowThreshold.map((item) => item.name).join(", ")}`);
}
