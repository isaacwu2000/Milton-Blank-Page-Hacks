import { config } from "../Web/backend/agent";

const startup = { timeoutMs: 330_000, pollMs: 500, requestMs: 2_000 } as const;

/**
 * Reuses a responsive local proxy or starts one and waits for its HTTP endpoint.
 * - Calls start once only when the initial check fails.
 * - Does not read credentials or switch providers; sign-in stays with openai-oauth.
 * - Rejects after a bounded wait so dependent services do not start disconnected.
 */
export async function ensureLocalProxy(start: () => void): Promise<void> {
  const ready = async () =>
    fetch(`${config.localProxyUrl}/models`, {
      signal: AbortSignal.timeout(startup.requestMs),
    })
      .then((response) => response.ok)
      .catch(() => false);
  if (await ready()) return;
  start();
  const deadline = Date.now() + startup.timeoutMs;
  while (Date.now() < deadline) {
    if (await ready()) return;
    await new Promise((resolve) => setTimeout(resolve, startup.pollMs));
  }
  throw Error(
    "ChatGPT could not start. Complete sign-in using bun run ai:proxy, then retry SportsBuilder.",
  );
}
