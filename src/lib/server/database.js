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
