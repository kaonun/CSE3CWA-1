import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import { PHONEMES } from "../src/data/phonemes.js";
import { openDatabase } from "../src/lib/db/connection.mjs";
import { phonemes } from "../src/lib/db/schema.mjs";

const connection = await openDatabase();
try {
  await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)) });
  // Seed reference data only; never overwrite a teacher's words/configurations.
  await connection.db.insert(phonemes).values(PHONEMES).onConflictDoNothing();
  console.log("Database migrations applied; phoneme inventory is ready.");
} finally {
  connection.close();
}
