import "server-only";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MAX_BODY_BYTES = 32 * 1024;

export async function readJson(request) {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim();
  if (mediaType !== "application/json") {
    throw new ApiError(415, "Send activity data as application/json.");
  }
  // Bound the actual stream, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Activity data is required.");
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "Activity data must be smaller than 32 KB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "Activity data must be valid JSON.");
  }
}

export function errorResponse(error) {
  if (!(error instanceof ApiError)) console.error("Activity generation failed:", error);
  return Response.json(
    { error: { message: error instanceof ApiError ? error.message : "Unable to generate the activity. Please try again." } },
    { status: error instanceof ApiError ? error.status : 500, headers: { "Cache-Control": "no-store" } },
  );
}
