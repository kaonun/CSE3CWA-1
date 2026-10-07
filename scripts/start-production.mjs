import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const standalone = new URL(".next/standalone/", root);
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
