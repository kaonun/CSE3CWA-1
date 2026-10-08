// A deterministic sample week used for the assessment reporting demonstration.
// IDs make startup seeding idempotent, while separate daily/type rows let the
// dashboard derive totals, success rate, average duration and activity mix.
export const SIMULATED_USAGE_METRICS = [
  { id: "sample-2026-09-28-wordle", recordedDate: "2026-09-28", activityType: "wordle", pageViews: 18, totalTimeSeconds: 3258, successfulGenerations: 17, failedGenerations: 1, simulated: true },
  { id: "sample-2026-09-28-wordsearch", recordedDate: "2026-09-28", activityType: "wordsearch", pageViews: 12, totalTimeSeconds: 2328, successfulGenerations: 12, failedGenerations: 0, simulated: true },
  { id: "sample-2026-09-29-wordle", recordedDate: "2026-09-29", activityType: "wordle", pageViews: 20, totalTimeSeconds: 3520, successfulGenerations: 19, failedGenerations: 1, simulated: true },
  { id: "sample-2026-09-29-wordsearch", recordedDate: "2026-09-29", activityType: "wordsearch", pageViews: 16, totalTimeSeconds: 3280, successfulGenerations: 15, failedGenerations: 1, simulated: true },
  { id: "sample-2026-09-30-wordle", recordedDate: "2026-09-30", activityType: "wordle", pageViews: 25, totalTimeSeconds: 4200, successfulGenerations: 24, failedGenerations: 1, simulated: true },
  { id: "sample-2026-09-30-wordsearch", recordedDate: "2026-09-30", activityType: "wordsearch", pageViews: 17, totalTimeSeconds: 3383, successfulGenerations: 17, failedGenerations: 0, simulated: true },
  { id: "sample-2026-10-01-wordle", recordedDate: "2026-10-01", activityType: "wordle", pageViews: 20, totalTimeSeconds: 3500, successfulGenerations: 20, failedGenerations: 0, simulated: true },
  { id: "sample-2026-10-01-wordsearch", recordedDate: "2026-10-01", activityType: "wordsearch", pageViews: 16, totalTimeSeconds: 3312, successfulGenerations: 16, failedGenerations: 0, simulated: true },
  { id: "sample-2026-10-02-wordle", recordedDate: "2026-10-02", activityType: "wordle", pageViews: 27, totalTimeSeconds: 4914, successfulGenerations: 25, failedGenerations: 2, simulated: true },
  { id: "sample-2026-10-02-wordsearch", recordedDate: "2026-10-02", activityType: "wordsearch", pageViews: 21, totalTimeSeconds: 4494, successfulGenerations: 20, failedGenerations: 1, simulated: true },
  { id: "sample-2026-10-03-wordle", recordedDate: "2026-10-03", activityType: "wordle", pageViews: 19, totalTimeSeconds: 3059, successfulGenerations: 18, failedGenerations: 1, simulated: true },
  { id: "sample-2026-10-03-wordsearch", recordedDate: "2026-10-03", activityType: "wordsearch", pageViews: 16, totalTimeSeconds: 3040, successfulGenerations: 15, failedGenerations: 1, simulated: true },
  { id: "sample-2026-10-04-wordle", recordedDate: "2026-10-04", activityType: "wordle", pageViews: 20, totalTimeSeconds: 3380, successfulGenerations: 20, failedGenerations: 0, simulated: true },
  { id: "sample-2026-10-04-wordsearch", recordedDate: "2026-10-04", activityType: "wordsearch", pageViews: 14, totalTimeSeconds: 2814, successfulGenerations: 13, failedGenerations: 1, simulated: true },
];
