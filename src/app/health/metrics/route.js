import { unstable_rethrow } from "next/navigation";
import { readDashboardData } from "@/lib/dashboard/metrics.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const dashboard = await readDashboardData();
    return Response.json({
      status: "ok",
      service: "phonemele",
      database: "sqlite",
      generatedAt: new Date().toISOString(),
      ...dashboard.observability,
    }, { headers });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Metrics health check failed:", error);
    return Response.json({
      status: "unavailable",
      message: "Reporting metrics are not available. Check the database setup.",
    }, { status: 503, headers });
  }
}
