export async function requestActivity(activity, signal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 15000);
  try {
    let response;
    try {
      response = await fetch("/api/activities/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activity),
        signal: controller.signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error("Could not reach the activity service. Please try again.");
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The activity service returned an unexpected response. Please try again.");
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("The activity service returned an unexpected response. Please try again.");
    }
    if (!response.ok) throw new Error(result.error?.message || "Unable to generate the activity.");
    if (typeof result.filename !== "string" || typeof result.html !== "string" ||
      (activity.type === "wordsearch" && (!result.preview || !Array.isArray(result.preview.grid) || !Array.isArray(result.preview.placements)))) {
      throw new Error("The activity service returned an unexpected response. Please try again.");
    }
    return result;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
