import { generateActivity } from "@/lib/server/activities";
import { errorResponse, readJson } from "@/lib/server/http";
import { recordGenerationSafely } from "@/lib/server/observability";

export const runtime = "nodejs";

export async function POST(request) {
  let activityType;
  try {
    const input = await readJson(request);
    activityType = input?.type;
    const activity = generateActivity(input);
    await recordGenerationSafely(activityType, true);
    return Response.json(activity, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await recordGenerationSafely(activityType, false);
    return errorResponse(error);
  }
}
