import "server-only";
import { ApiError } from "./http";

export function storageResponse(data, status = 200) {
  return Response.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
}
export function storageRoute(action) {
  return async (request, context) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        const origin = request.headers.get("origin");
        // Standalone normalizes request.url to its internal hostname. The
        // browser's Host header retains the public loopback host and port.
        const url = new URL(request.url);
        const requestOrigin = `${url.protocol}//${request.headers.get("host") || url.host}`;
        if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== requestOrigin)) {
          throw new ApiError(403, "Changes must be made from this application's own page.");
        }
      }
      return await action(request, context);
    } catch (error) {
      if (!(error instanceof ApiError)) console.error("Stored content request failed:", error);
      return Response.json({ error: { message: error instanceof ApiError ? error.message : "Unable to access saved content. Please try again or check the database setup." } },
        { status: error instanceof ApiError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
    }
  };
}
