import { generateActivity } from "@/lib/server/activities";
import { errorResponse, readJson } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const activity = generateActivity(await readJson(request));
    return Response.json(activity, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
