import { config } from "../config";
import type { SavedTool, ToolConfig } from "../../../shared";

/**
 * Save only a reviewed configuration; jobId is the build's UUID.
 * Retry transport errors or server failures at most twice, preserving that UUID
 * and payload on every attempt so a late response cannot duplicate a coach.
 * Credential/client failures stop immediately; exhausted retries explain recovery.
 */
export async function publishReviewedTool(
  tool: ToolConfig,
  jobId: string,
): Promise<SavedTool> {
  const secret = process.env.AGENT_INTERNAL_SECRET;
  if (!secret) throw Error("The internal agent connection is not configured.");
  for (let attempt = 0; attempt < config.saveAttempts; attempt++) {
    if (attempt)
      await new Promise((resolve) => setTimeout(resolve, config.saveRetryMs));
    let response: Response;
    try {
      response = await fetch(`${config.backendUrl}/api/tools`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-agent-secret": secret,
          "x-agent-job-id": jobId,
        },
        body: JSON.stringify(tool),
        signal: AbortSignal.timeout(config.backendTimeoutMs),
      });
      if (response.ok) return await response.json();
    } catch {
      if (attempt + 1 < config.saveAttempts) continue;
      throw Error(
        "Saving your reviewed coach timed out or lost connection to the video service. Check the local services and retry.",
      );
    }
    if (response.status >= 500 && attempt + 1 < config.saveAttempts) {
      await response.body?.cancel();
      continue;
    }
    const data = await response.json().catch(() => ({}));
    throw Error(
      typeof data.detail === "string"
        ? data.detail
        : "Your reviewed coach could not be saved. Check the database connection and retry.",
    );
  }
  throw Error("Your reviewed coach could not be saved. Please retry.");
}
