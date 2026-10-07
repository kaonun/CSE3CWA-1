import { sql } from "drizzle-orm";
import { withDatabase } from "@/lib/server/database";
import { phonemes } from "@/lib/db/schema.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const [inventory] = await withDatabase((db) => db.select({ count: sql`count(*)` }).from(phonemes));
    if (inventory.count !== 43) throw new Error("Database inventory is incomplete. Run db:migrate.");
    return Response.json({ status: "ok", database: "sqlite" }, { headers });
  } catch (error) {
    console.error("Database readiness check failed:", error);
    return Response.json({ status: "unavailable", message: "Database is not ready. Check the server setup." }, { status: 503, headers });
  }
}
