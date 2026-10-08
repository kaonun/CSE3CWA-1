import { asc, desc, eq } from "drizzle-orm";
import { openDatabase } from "@/lib/db/connection.mjs";
import {
  activityConfigurations,
  usageMetrics,
  wordLists,
  words,
} from "@/lib/db/schema.mjs";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatUpdatedAt(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function summariseUsage(records) {
  const byDate = new Map();
  const typeUsage = { wordle: 0, wordsearch: 0 };
  let successful = 0;
  let failed = 0;
  let pageViews = 0;
  let totalTimeSeconds = 0;
  let simulatedRecords = 0;
  let liveRecords = 0;

  for (const record of records) {
    const day = byDate.get(record.recordedDate) || {
      date: record.recordedDate,
      successful: 0,
      failed: 0,
    };
    day.successful += record.successfulGenerations;
    day.failed += record.failedGenerations;
    byDate.set(record.recordedDate, day);
    successful += record.successfulGenerations;
    failed += record.failedGenerations;
    pageViews += record.pageViews;
    totalTimeSeconds += record.totalTimeSeconds;
    typeUsage[record.activityType] += record.pageViews;
    if (record.simulated) simulatedRecords++;
    else liveRecords++;
  }

  const weeklyUsage = [...byDate.values()].map((record) => ({
    ...record,
    day: new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${record.date}T00:00:00Z`)),
  }));

  return {
    weeklyUsage,
    successful,
    failed,
    totalGenerations: successful + failed,
    pageViews,
    averageTimeSeconds: pageViews
      ? Math.round(totalTimeSeconds / pageViews)
      : 0,
    typeUsage,
    totalTimeSeconds,
    simulatedRecords,
    liveRecords,
  };
}

function buildDashboardData(snapshot, databaseStatus = "connected") {
  const usage = summariseUsage(snapshot.usageMetrics);
  const totalWords = snapshot.wordLists.reduce(
    (total, list) => total + list.wordCount,
    0,
  );
  const populatedLists = snapshot.wordLists.filter(
    (list) => list.wordCount > 0,
  ).length;
  const wordleCount = snapshot.activities.filter(
    (activity) => activity.type === "wordle",
  ).length;
  const wordSearchCount = snapshot.activities.filter(
    (activity) => activity.type === "wordsearch",
  ).length;
  const recentActivities = snapshot.activities.slice(0, 5).map((activity) => ({
    ...activity,
    difficulty:
      activity.type === "wordle"
        ? `${activity.maxGuesses} guesses`
        : activity.difficulty,
    updatedAt: formatUpdatedAt(activity.updatedAt),
    status: "Saved",
  }));
  const mostUsedActivityType = usage.pageViews
    ? Object.entries(usage.typeUsage).sort((left, right) => right[1] - left[1])[0][0]
    : null;

  const alerts = snapshot.wordLists
    .filter((list) => list.wordCount === 0)
    .map((list) => ({
      id: `empty-${list.id}`,
      severity: "warning",
      title: "Empty word list",
      detail: `${list.title} cannot generate an activity until words are added.`,
    }));

  if (snapshot.wordLists.length === 0) {
    alerts.push({
      id: "no-lists",
      severity: "notice",
      title: "No saved word lists",
      detail: "Create a list in the Library to begin tracking live builder data.",
    });
  }

  if (usage.failed > 0) {
    alerts.push({
      id: "generation-failures",
      severity: "warning",
      title: "Generation failures recorded",
      detail: `The persisted reporting sample contains ${usage.failed} failed generations to review.`,
    });
  }

  if (snapshot.usageMetrics.length === 0) {
    alerts.push({
      id: "no-reporting-data",
      severity: "notice",
      title: "No reporting records",
      detail: "Add usage metrics before relying on generation and time summaries.",
    });
  }

  if (databaseStatus !== "connected") {
    alerts.unshift({
      id: "database-unavailable",
      severity: "danger",
      title: "Database unavailable",
      detail: "Live builder totals could not be loaded. Check the database health endpoint.",
    });
  }

  return {
    dataNote:
      databaseStatus === "connected"
        ? `${usage.simulatedRecords} simulated and ${usage.liveRecords} live daily/type records are persisted in SQLite; builder totals come from the same database.`
        : "Reporting and builder data are unavailable until the database connection recovers.",
    databaseStatus,
    metrics: [
      {
        id: "activities",
        label: "Activities created",
        value: snapshot.activities.length.toString(),
        detail: `${wordleCount} Wordle · ${wordSearchCount} Word Search`,
        badge: "Live database",
        tone: "purple",
        icon: "tiles",
      },
      {
        id: "successful",
        label: "Generated outputs",
        value: usage.totalGenerations.toLocaleString("en-AU"),
        detail: `${usage.successful} successful · ${usage.failed} failed`,
        badge: "Persisted + live",
        tone: "green",
        icon: "check",
      },
      {
        id: "average-time",
        label: "Average time on page",
        value: formatDuration(usage.averageTimeSeconds),
        detail: `Across ${usage.pageViews} persisted page views`,
        badge: "Database average",
        tone: "blue",
        icon: "clock",
      },
      {
        id: "word-lists",
        label: "Stored word lists",
        value: snapshot.wordLists.length.toString(),
        detail: `${totalWords} saved words available`,
        badge: "Live database",
        tone: "orange",
        icon: "list",
      },
    ],
    weeklyUsage: usage.weeklyUsage,
    generationTotals: {
      successful: usage.successful,
      failed: usage.failed,
      total: usage.totalGenerations,
    },
    activityMix: [
      { type: "Wordle", count: wordleCount, usage: usage.typeUsage.wordle },
      { type: "Word Search", count: wordSearchCount, usage: usage.typeUsage.wordsearch },
    ].map((item) => ({
      ...item,
      percentage: usage.pageViews
        ? Math.round((item.usage / usage.pageViews) * 100)
        : 0,
      isMostUsed:
        usage.pageViews > 0 &&
        item.usage === Math.max(...Object.values(usage.typeUsage)),
    })),
    recentActivities,
    recentActivitiesAreSimulated: false,
    alerts,
    observability: {
      activityConfigurations: {
        total: snapshot.activities.length,
        wordle: wordleCount,
        wordsearch: wordSearchCount,
      },
      generations: {
        total: usage.totalGenerations,
        successful: usage.successful,
        failed: usage.failed,
        successRate: usage.totalGenerations
          ? Number(((usage.successful / usage.totalGenerations) * 100).toFixed(1))
          : 0,
      },
      pageUsage: {
        views: usage.pageViews,
        totalTimeSeconds: usage.totalTimeSeconds,
        averageTimeSeconds: usage.averageTimeSeconds,
        mostUsedActivityType,
        byActivityType: usage.typeUsage,
      },
      reportingRecords: {
        total: snapshot.usageMetrics.length,
        simulated: usage.simulatedRecords,
        live: usage.liveRecords,
      },
      alerts: alerts.map(({ severity, title }) => ({ severity, title })),
    },
    wordListSummary: {
      totalLists: snapshot.wordLists.length,
      populatedLists,
      totalWords,
      completeness: snapshot.wordLists.length
        ? Math.round((populatedLists / snapshot.wordLists.length) * 100)
        : 0,
      recentlyUpdated: snapshot.wordLists.slice(0, 3).map((list) => ({
        ...list,
        updatedAt: formatUpdatedAt(list.updatedAt),
      })),
    },
  };
}

async function readDashboardSnapshot() {
  const connection = await openDatabase();
  try {
    const [storedLists, storedWords, storedActivities, storedUsageMetrics] = await Promise.all([
      connection.db
        .select({
          id: wordLists.id,
          title: wordLists.title,
          updatedAt: wordLists.updatedAt,
        })
        .from(wordLists)
        .orderBy(desc(wordLists.updatedAt)),
      connection.db
        .select({ id: words.id, wordListId: words.wordListId })
        .from(words),
      connection.db
        .select({
          id: activityConfigurations.id,
          title: activityConfigurations.title,
          type: activityConfigurations.type,
          maxGuesses: activityConfigurations.maxGuesses,
          difficulty: activityConfigurations.difficulty,
          updatedAt: activityConfigurations.updatedAt,
          wordListTitle: wordLists.title,
        })
        .from(activityConfigurations)
        .innerJoin(
          wordLists,
          eq(activityConfigurations.wordListId, wordLists.id),
        )
        .orderBy(desc(activityConfigurations.updatedAt)),
      connection.db
        .select({
          recordedDate: usageMetrics.recordedDate,
          activityType: usageMetrics.activityType,
          pageViews: usageMetrics.pageViews,
          totalTimeSeconds: usageMetrics.totalTimeSeconds,
          successfulGenerations: usageMetrics.successfulGenerations,
          failedGenerations: usageMetrics.failedGenerations,
          simulated: usageMetrics.simulated,
        })
        .from(usageMetrics)
        .orderBy(asc(usageMetrics.recordedDate)),
    ]);

    const counts = new Map();
    for (const word of storedWords) {
      counts.set(word.wordListId, (counts.get(word.wordListId) || 0) + 1);
    }

    return {
      wordLists: storedLists.map((list) => ({
        ...list,
        wordCount: counts.get(list.id) || 0,
      })),
      activities: storedActivities,
      usageMetrics: storedUsageMetrics,
    };
  } finally {
    await connection.close();
  }
}

export async function readDashboardData() {
  const snapshot = await readDashboardSnapshot();
  return buildDashboardData(snapshot);
}

export function unavailableDashboardData() {
  return buildDashboardData(
    { wordLists: [], activities: [], usageMetrics: [] },
    "unavailable",
  );
}
