import "server-only";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MAX_BODY_BYTES = 32 * 1024;

export async function readJson(request) {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new ApiError(415, "Send request data as application/json.");
  }
  // Bound the actual stream, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request data is required.");
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "Request data must be no larger than 32 KB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    // Do not silently substitute replacement characters for damaged IPA bytes.
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    return JSON.parse(decoded);
  } catch {
    throw new ApiError(400, "Request data must be valid UTF-8 JSON.");
  }
}

export function errorResponse(error) {
  if (!(error instanceof ApiError)) console.error("Activity generation failed:", error);
  return Response.json(
    { error: { message: error instanceof ApiError ? error.message : "Unable to generate the activity. Please try again." } },
    { status: error instanceof ApiError ? error.status : 500, headers: { "Cache-Control": "no-store" } },
  );
}
