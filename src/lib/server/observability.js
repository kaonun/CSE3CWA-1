import "server-only";
import { sql } from "drizzle-orm";
import { usageMetrics } from "@/lib/db/schema.mjs";
import { withDatabase } from "./database";

const ACTIVITY_TYPES = new Set(["wordle", "wordsearch"]);

function reportingDate() {
  return new Date().toISOString().slice(0, 10);
}

async function incrementUsage(activityType, increments) {
  if (!ACTIVITY_TYPES.has(activityType)) return;
  const recordedDate = reportingDate();
  const values = {
    id: `live-${recordedDate}-${activityType}`,
    recordedDate,
    activityType,
    pageViews: increments.pageViews || 0,
    totalTimeSeconds: increments.totalTimeSeconds || 0,
    successfulGenerations: increments.successfulGenerations || 0,
    failedGenerations: increments.failedGenerations || 0,
    simulated: false,
  };

  await withDatabase((db) => db
    .insert(usageMetrics)
    .values(values)
    .onConflictDoUpdate({
      target: [usageMetrics.recordedDate, usageMetrics.activityType, usageMetrics.simulated],
      set: {
        pageViews: sql`${usageMetrics.pageViews} + ${values.pageViews}`,
        totalTimeSeconds: sql`${usageMetrics.totalTimeSeconds} + ${values.totalTimeSeconds}`,
        successfulGenerations: sql`${usageMetrics.successfulGenerations} + ${values.successfulGenerations}`,
        failedGenerations: sql`${usageMetrics.failedGenerations} + ${values.failedGenerations}`,
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      },
    }));
}

// Metrics must never make an otherwise valid generation fail. Database errors
// remain visible in server logs and through the readiness/metrics endpoints.
export async function recordGenerationSafely(activityType, successful) {
  try {
    await incrementUsage(activityType, successful
      ? { successfulGenerations: 1 }
      : { failedGenerations: 1 });
  } catch (error) {
    console.error("Generation metric could not be recorded:", error);
  }
}

export function recordPageView(activityType, durationSeconds) {
  return incrementUsage(activityType, {
    pageViews: 1,
    totalTimeSeconds: durationSeconds,
  });
}
