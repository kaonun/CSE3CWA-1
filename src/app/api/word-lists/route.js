import { readJson } from "@/lib/server/http";
import { createList, listLists } from "@/lib/server/storage";
import { pagination } from "@/lib/server/storage-validation";
import { storageResponse, storageRoute } from "@/lib/server/storage-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = storageRoute(async (request) => Response.json(await listLists(pagination(request)), { headers: { "Cache-Control": "no-store" } }));
export const POST = storageRoute(async (request) => storageResponse(await createList(await readJson(request)), 201));
