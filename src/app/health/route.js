export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", service: "phonemele" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
