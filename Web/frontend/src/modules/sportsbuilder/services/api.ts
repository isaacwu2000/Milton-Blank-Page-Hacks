import { READ_RETRY } from "../config";

const unavailable = "The service is temporarily unavailable. Please try again.";

/** Retry safe reads across brief local-service restarts; never replay mutations. */
export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const read = (init?.method ?? "GET").toUpperCase() === "GET";
  const attempts = read ? READ_RETRY.attempts : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt)
      await new Promise((resolve) =>
        setTimeout(resolve, READ_RETRY.baseDelayMs * 2 ** (attempt - 1)),
      );
    init?.signal?.throwIfAborted();
    let response: Response;
    try {
      response = await fetch(path, {
        ...init,
        headers: {
          ...(init?.body instanceof FormData
            ? {}
            : { "content-type": "application/json" }),
          ...init?.headers,
        },
      });
    } catch (error) {
      if (init?.signal?.aborted) throw error;
      if (attempt + 1 < attempts) continue;
      throw Error(unavailable);
    }
    if (
      READ_RETRY.statuses.includes(response.status) &&
      attempt + 1 < attempts
    ) {
      await response.body?.cancel();
      continue;
    }
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const details =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};
      throw Error(
        typeof details.detail === "string"
          ? details.detail
          : typeof details.error === "string"
            ? details.error
            : unavailable,
      );
    }
    if (data === null)
      throw Error(
        "The service returned an unreadable response. Please try again.",
      );
    return data as T;
  }
  throw Error(unavailable);
}
export const post = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
