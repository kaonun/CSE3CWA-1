"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ACTIVITY_PATHS = {
  "/wordle": "wordle",
  "/wordsearch": "wordsearch",
};

export default function ActivityPageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const activityType = ACTIVITY_PATHS[pathname];
    if (!activityType) return undefined;

    const startedAt = performance.now();
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      const durationSeconds = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
      const body = new Blob(
        [JSON.stringify({ activityType, durationSeconds })],
        { type: "application/json" },
      );
      navigator.sendBeacon("/api/observability/page-view", body);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") record();
    };

    window.addEventListener("pagehide", record);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", record);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Ignore React development's immediate effect rehearsal and sub-second
      // route changes, which are not meaningful time-on-page observations.
      if (performance.now() - startedAt >= 1000) record();
    };
  }, [pathname]);

  return null;
}
