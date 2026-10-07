import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.mjs";

export function databasePath() {
  // Deliberately server-only configuration, never a NEXT_PUBLIC variable.
  // Runtime data lives outside the build artifact; never trace/copy teacher data.
  return resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || "data/phonemele.db");
}

export async function openDatabase(path = databasePath()) {
  await mkdir(dirname(path), { recursive: true });
  // A single local connection keeps per-connection PRAGMAs consistent.
  const client = createClient({ url: pathToFileURL(path).href, concurrency: 1 });
  try {
    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute("PRAGMA busy_timeout = 5000");
    await client.execute("PRAGMA journal_mode = WAL");
    return { client, db: drizzle(client, { schema }), close: () => client.close() };
  } catch (error) {
    client.close();
    throw error;
  }
}
