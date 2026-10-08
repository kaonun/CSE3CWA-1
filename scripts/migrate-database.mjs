import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import { PHONEMES } from "../src/data/phonemes.js";
import { SIMULATED_USAGE_METRICS } from "../src/data/simulated-usage.js";
import { openDatabase } from "../src/lib/db/connection.mjs";
import { phonemes, usageMetrics } from "../src/lib/db/schema.mjs";

const connection = await openDatabase();
try {
  await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)) });
  // Seed reference/reporting data only; never overwrite teacher content.
  await connection.db.insert(phonemes).values(PHONEMES).onConflictDoNothing();
  await connection.db.insert(usageMetrics).values(SIMULATED_USAGE_METRICS).onConflictDoNothing();
  console.log("Database migrations applied; phoneme inventory and reporting sample are ready.");
} finally {
  await connection.close();
}
