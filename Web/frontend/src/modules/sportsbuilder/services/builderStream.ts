import {
  readLines,
  type Message,
  type ToolConfig,
} from "../../../../../shared";
import type { Brief } from "../types";

export type BuilderEvent =
  | { type: "text"; text: string }
  | { type: "status"; message: string }
  | { type: "error"; message: string }
  | {
      type: "complete";
      reply: string;
      ready: boolean;
      brief?: Brief;
      preview?: ToolConfig;
      id?: string;
      revision: number;
    };
export type BuilderTurn = {
  messages: Message[];
  current?: ToolConfig;
  revision: number;
  force: boolean;
  referenceId?: string;
};

/**
 * Streams one builder turn without buffering the whole response or replaying a request.
 * - Requires a final complete event; interrupted streams cannot publish a preview.
 * - Caller cancellation closes the network reader and invalidates stale UI callbacks.
 */
export async function streamBuilder(
  turn: BuilderTurn,
  onEvent: (event: BuilderEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch("/agent/builder/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(turn),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Error(
      data.error ??
        data.detail ??
        "Could not start the coach update. Please retry.",
    );
  }
  if (!response.body)
    throw Error("The coach returned no response stream. Please retry.");
  let complete: Extract<BuilderEvent, { type: "complete" }> | undefined;
  for await (const line of readLines(response.body)) {
    signal.throwIfAborted();
    if (!line.trim()) continue;
    const event = JSON.parse(line) as BuilderEvent;
    if (complete)
      throw Error("Unexpected data after the completed coach update.");
    if (event.type === "error") throw Error(event.message);
    if (event.type === "complete") complete = event;
    else onEvent(event);
  }
  if (!complete)
    throw Error(
      "The coach connection ended before the update finished. Please retry.",
    );
  signal.throwIfAborted();
  onEvent(complete);
}
