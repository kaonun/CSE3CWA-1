import { desc, eq } from "drizzle-orm";
import { openDatabase } from "@/lib/db/connection.mjs";
import {
  activityConfigurations,
  wordLists,
  words,
} from "@/lib/db/schema.mjs";

const weeklyUsage = [
  { day: "Mon", successful: 29, failed: 1 },
  { day: "Tue", successful: 34, failed: 2 },
  { day: "Wed", successful: 41, failed: 1 },
  { day: "Thu", successful: 36, failed: 0 },
  { day: "Fri", successful: 45, failed: 3 },
  { day: "Sat", successful: 33, failed: 2 },
  { day: "Sun", successful: 33, failed: 1 },
];

const simulatedActivities = [
  {
    id: "sample-wordle-short-a",
    title: "Short A challenge",
    type: "wordle",
    wordListTitle: "Short A starters",
    difficulty: "Beginner",
    updatedAt: "Sample record",
    status: "Monitored",
  },
  {
    id: "sample-search-blends",
    title: "Blend finder grid",
    type: "wordsearch",
    wordListTitle: "Consonant blends",
    difficulty: "Intermediate",
    updatedAt: "Sample record",
    status: "Healthy",
  },
  {
    id: "sample-wordle-long-a",
    title: "Long A daily",
    type: "wordle",
    wordListTitle: "Long A patterns",
    difficulty: "Intermediate",
    updatedAt: "Sample record",
    status: "Healthy",
  },
];

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatUpdatedAt(value) {
  if (!value || value === "Sample record") return value || "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildDashboardData(snapshot, databaseStatus = "connected") {
  const successful = weeklyUsage.reduce(
    (total, day) => total + day.successful,
    0,
  );
  const failed = weeklyUsage.reduce((total, day) => total + day.failed, 0);
  const totalSessions = successful + failed;
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
  const recentActivities = snapshot.activities.length
    ? snapshot.activities.slice(0, 5).map((activity) => ({
        ...activity,
        difficulty:
          activity.type === "wordle"
            ? `${activity.maxGuesses} guesses`
            : activity.difficulty,
        updatedAt: formatUpdatedAt(activity.updatedAt),
        status: "Saved",
      }))
    : simulatedActivities;

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

  alerts.push({
    id: "sample-failures",
    severity: "warning",
    title: "Repeated generation failures",
    detail: "The simulated weekly sample contains 10 failed generations to review.",
  });

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
      "Builder totals are read from SQLite. Usage and time metrics are simulated Step 1 records pending persistence in Step 2.",
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
        label: "Successful generations",
        value: successful.toLocaleString("en-AU"),
        detail: `${((successful / totalSessions) * 100).toFixed(1)}% success rate`,
        badge: "Sample week",
        tone: "green",
        icon: "check",
      },
      {
        id: "average-time",
        label: "Average time on page",
        value: formatDuration(183),
        detail: `Across ${totalSessions} simulated sessions`,
        badge: "−12 sec",
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
    weeklyUsage,
    generationTotals: { successful, failed, total: totalSessions },
    activityMix: [
      {
        type: "Wordle",
        count: wordleCount,
        usage: 149,
        percentage: 57,
        isMostUsed: true,
      },
      {
        type: "Word Search",
        count: wordSearchCount,
        usage: 112,
        percentage: 43,
        isMostUsed: false,
      },
    ],
    recentActivities,
    recentActivitiesAreSimulated: snapshot.activities.length === 0,
    alerts,
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

async function readBuilderSnapshot() {
  const connection = await openDatabase();
  try {
    const [storedLists, storedWords, storedActivities] = await Promise.all([
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
    };
  } finally {
    await connection.close();
  }
}

export async function readDashboardData() {
  const snapshot = await readBuilderSnapshot();
  return buildDashboardData(snapshot);
}

export function unavailableDashboardData() {
  return buildDashboardData(
    { wordLists: [], activities: [] },
    "unavailable",
  );
}
