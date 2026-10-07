import { readJson } from "@/lib/server/http";
import { generateSavedActivity } from "@/lib/server/saved-activities";
import { objectFields } from "@/lib/server/storage-validation";
import { storageResponse, storageRoute } from "@/lib/server/storage-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = storageRoute(async (request, { params }) => {
  // Saved generation accepts no client-side word/settings overrides.
  objectFields(await readJson(request), []);
  return storageResponse(await generateSavedActivity((await params).id));
});
