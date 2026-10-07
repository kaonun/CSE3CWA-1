import { readJson } from "@/lib/server/http";
import { deleteWord, getWord, updateWord } from "@/lib/server/storage";
import { storageResponse, storageRoute } from "@/lib/server/storage-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = storageRoute(async (_, { params }) => storageResponse(await getWord((await params).id)));
export const PATCH = storageRoute(async (request, { params }) => storageResponse(await updateWord((await params).id, await readJson(request))));
export const DELETE = storageRoute(async (_, { params }) => {
  await deleteWord((await params).id);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
});
