import { readJson } from "@/lib/server/http";
import { deleteConfiguration, getConfiguration, updateConfiguration } from "@/lib/server/storage";
import { storageResponse, storageRoute } from "@/lib/server/storage-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = storageRoute(async (_, { params }) => storageResponse(await getConfiguration((await params).id)));
export const PATCH = storageRoute(async (request, { params }) => storageResponse(await updateConfiguration((await params).id, await readJson(request))));
export const DELETE = storageRoute(async (_, { params }) => {
  await deleteConfiguration((await params).id);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
});
