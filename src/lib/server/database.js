import "server-only";
import { openDatabase } from "../db/connection.mjs";

export async function getDatabase() {
  // Reuse one connection across Next.js development reloads and route requests.
  if (!globalThis.phonemeleDatabase) {
    globalThis.phonemeleDatabase = openDatabase().catch((error) => {
      delete globalThis.phonemeleDatabase;
      throw error;
    });
  }
  return globalThis.phonemeleDatabase;
}

// libSQL's single connection cannot be borrowed while a transaction owns it.
// Queue all application database work, including readiness, across route modules.
export function withDatabase(action) {
  const previous = globalThis.phonemeleDatabaseWork || Promise.resolve();
  const work = previous.then(async () => action((await getDatabase()).db));
  globalThis.phonemeleDatabaseWork = work.then(() => undefined, () => undefined);
  return work;
}
