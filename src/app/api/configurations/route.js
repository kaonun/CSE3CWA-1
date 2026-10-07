import { readJson } from "@/lib/server/http";
import { createConfiguration, listConfigurations } from "@/lib/server/storage";
import { pagination } from "@/lib/server/storage-validation";
import { storageResponse, storageRoute } from "@/lib/server/storage-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = storageRoute(async (request) => {
  const query = new URL(request.url).searchParams;
  const result = await listConfigurations({ ...pagination(request), wordListId: query.get("wordListId"), type: query.get("type") });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});
export const POST = storageRoute(async (request) => storageResponse(await createConfiguration(await readJson(request)), 201));
