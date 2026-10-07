import { readJson } from "@/lib/server/http";
import { createWord, getList } from "@/lib/server/storage";
import { storageResponse, storageRoute } from "@/lib/server/storage-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = storageRoute(async (_, { params }) => storageResponse((await getList((await params).id)).words));
export const POST = storageRoute(async (request, { params }) => storageResponse(await createWord((await params).id, await readJson(request)), 201));
