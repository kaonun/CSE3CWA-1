import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { databasePath } from "../src/lib/db/connection.mjs";

const root = new URL("../", import.meta.url);
const standalone = new URL(".next/standalone/", root);
// The generated server changes cwd to .next/standalone. Freeze the original
// absolute database path so migration and runtime always open the same file.
process.env.DATABASE_PATH = databasePath();
await import("./migrate-database.mjs");
// Next.js traces server dependencies but leaves browser/public assets separate.
// The Dockerfile copies them at image build time; local startup prepares them here.
await mkdir(new URL(".next/", standalone), { recursive: true });
await cp(fileURLToPath(new URL(".next/static/", root)), fileURLToPath(new URL(".next/static/", standalone)), { recursive: true });
try {
  await cp(fileURLToPath(new URL("public/", root)), fileURLToPath(new URL("public/", standalone)), { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
await import(new URL("server.js", standalone).href);
