import { readJson } from "@/lib/server/http";
import { recordPageView } from "@/lib/server/observability";
import { objectFields, requireInput } from "@/lib/server/storage-validation";
import { storageRoute } from "@/lib/server/storage-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = storageRoute(async (request) => {
  const input = objectFields(
    await readJson(request),
    ["activityType", "durationSeconds"],
  );
  requireInput(
    input.activityType === "wordle" || input.activityType === "wordsearch",
    "Activity type must be Wordle or Word Search.",
  );
  requireInput(
    Number.isInteger(input.durationSeconds) &&
      input.durationSeconds >= 1 &&
      input.durationSeconds <= 86400,
    "Page duration must be a whole number from 1 to 86400 seconds.",
  );
  await recordPageView(input.activityType, input.durationSeconds);
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
});
