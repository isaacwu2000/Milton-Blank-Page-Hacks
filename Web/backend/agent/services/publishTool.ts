/** Save an accepted coach with one identity so retrying a lost response cannot duplicate it. */
import { config } from "../config";
import type { SavedTool, ToolConfig } from "../../../shared";

export async function publishReviewedTool(
  tool: ToolConfig,
  jobId: string,
): Promise<SavedTool> {
  const secret = process.env.AGENT_INTERNAL_SECRET;
  if (!secret) throw Error("The internal agent connection is not configured.");
  for (let attempt = 0; attempt < 2; attempt++) {
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
      if (attempt === 0) continue;
      throw Error(
        "Saving your reviewed coach timed out or lost connection to the video service. Your video has not been uploaded. Check the local services and retry.",
      );
    }
    if (response.status >= 500 && attempt === 0) {
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
