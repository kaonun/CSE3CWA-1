// Never retry writes automatically: a timed-out request may already be saved.
export async function storageRequest(path, { method = "GET", body, signal } = {}) {
  try {
    const response = await fetch(`/api${path}`, {
      method, cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    if (response.status === 204) return null;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "The saved content could not be accessed.");
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error.name === "TimeoutError") throw new Error("The request timed out. Reload to check whether your change was saved before trying again.");
    if (error instanceof TypeError) throw new Error("Cannot reach the server. Check your connection and try again.");
    throw error;
  }
}
