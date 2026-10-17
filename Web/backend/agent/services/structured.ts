import { z } from "zod";
import { normalizePracticeStep } from "../../../shared";
import { briefSchema } from "./buildBrief";
import { chat, parseJSON } from "./provider";
import type { Chat, Tool } from "../types";

export const interviewResponseSchema = z
  .object({
    reply: z.string().min(1).max(8000),
    ready: z.boolean(),
    brief: briefSchema.nullish().transform((brief) => brief ?? undefined),
  })
  .refine((response) => !response.ready || Boolean(response.brief), {
    message: "A ready interview requires a complete brief.",
  });
export const coachResponseSchema = z.object({
  reply: z.string().min(1).max(10000),
  feedback: z
    .object({
      doingWell: z.array(z.string().min(1).max(400)).max(4),
      improve: z.array(z.string().min(1).max(400)).max(4),
      limitations: z.array(z.string().min(1).max(400)).max(4),
    })
    .nullish()
    .transform((feedback) => feedback ?? undefined),
  drill: z
    .object({
      title: z.string().min(1).max(120),
      instructions: z.string().min(1).max(2000),
      steps: z.array(z.string().max(320).transform(normalizePracticeStep).pipe(z.string().min(1).max(300))).min(2).max(6)
        .refine((steps) => new Set(steps).size === steps.length, "Practice steps must be distinct.")
        .optional(),
    })
    .nullish()
    .transform((drill) => drill ?? undefined),
});

/**
 * Validates model output and allows one correction for malformed JSON or fields.
 * - Null optional records mean the model has no brief or drill yet.
 * - Provider failures and cancellation propagate without extra requests.
 * - Model validation failures never become user request validation errors.
 */
export async function structured<Schema extends z.ZodTypeAny>(
  messages: Chat[],
  tool: Tool,
  schema: Schema,
  signal: AbortSignal,
): Promise<z.output<Schema>> {
  let correction: Chat[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    const response = await chat([...messages, ...correction], [tool], signal);
    const call = response.tool_calls?.find(
      (item) => item.function.name === tool.name,
    );
    try {
      return schema.parse(
        call
          ? JSON.parse(call.function.arguments)
          : parseJSON(response.content),
      );
    } catch (error) {
      // Only errors from parsing the model response are retried; provider errors stay outside this block.
      const details =
        error instanceof z.ZodError
          ? error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")
          : "Return valid JSON using the requested function.";
      correction = [
        {
          role: "system",
          content: `Your response did not match the required result: ${details}. Correct the response using ${tool.name}. Preserve the user's requirements. Omit optional records when unavailable. Keep every field within its limits.`,
        },
      ];
    }
  }
  throw Error(
    "The AI returned an incomplete response. Please retry your message.",
  );
}
