import { afterEach, describe, expect, it, vi } from "vitest";
import {
  structured,
  interviewResponseSchema,
  coachResponseSchema,
} from "./services/structured";
import { chat } from "./services/provider";
vi.mock("./services/provider", () => ({
  chat: vi.fn(),
  parseJSON: (content: string) => JSON.parse(content),
}));
afterEach(() => vi.resetAllMocks());
const messages = [
  { role: "user" as const, content: "Build a forehand squash serve coach." },
];
const tool = {
  name: "interview_response",
  description: "Return the interview.",
  parameters: { type: "object" },
};
describe("structured interview and coaching responses", () => {
  it("accepts an unfinished interview with an explicit absent brief", async () => {
    vi.mocked(chat).mockResolvedValue({
      role: "assistant",
      content: '{"reply":"Who is this for?","ready":false,"brief":null}',
    });
    await expect(
      structured(
        messages,
        tool,
        interviewResponseSchema,
        AbortSignal.timeout(1000),
      ),
    ).resolves.toEqual({
      reply: "Who is this for?",
      ready: false,
      brief: undefined,
    });
  });
  it("repairs invalid model fields instead of blaming a valid user prompt", async () => {
    vi.mocked(chat)
      .mockResolvedValueOnce({
        role: "assistant",
        content: '{"reply":"Who is this for?","ready":"false"}',
      })
      .mockResolvedValueOnce({
        role: "assistant",
        content: '{"reply":"Who is this for?","ready":false}',
      });
    await expect(
      structured(
        messages,
        tool,
        interviewResponseSchema,
        AbortSignal.timeout(1000),
      ),
    ).resolves.toMatchObject({ ready: false });
    expect(chat).toHaveBeenCalledTimes(2);
  });
  it("reports persistent malformed output as an AI failure rather than a request validation error", async () => {
    vi.mocked(chat).mockResolvedValue({
      role: "assistant",
      content: '{"reply":"Who is this for?","ready":"false"}',
    });
    await expect(
      structured(
        messages,
        tool,
        interviewResponseSchema,
        AbortSignal.timeout(1000),
      ),
    ).rejects.toThrow(
      "The AI returned an incomplete response. Please retry your message.",
    );
    expect(chat).toHaveBeenCalledTimes(2);
  });
  it("accepts coaching without an optional drill", async () => {
    vi.mocked(chat).mockResolvedValue({
      role: "assistant",
      content: '{"reply":"At 1.2 seconds, your knee bends.","drill":null}',
    });
    await expect(
      structured(
        messages,
        { ...tool, name: "coach_response" },
        coachResponseSchema,
        AbortSignal.timeout(1000),
      ),
    ).resolves.toEqual({
      reply: "At 1.2 seconds, your knee bends.",
      drill: undefined,
    });
  });
  it("requires a complete brief before declaring the interview ready", () => {
    expect(
      interviewResponseSchema.safeParse({
        reply: "Ready",
        ready: true,
        brief: null,
      }).success,
    ).toBe(false);
  });
  it("preserves provider failures without retries", async () => {
    vi.mocked(chat).mockRejectedValue(Error("Provider is unavailable"));
    await expect(
      structured(
        messages,
        tool,
        interviewResponseSchema,
        AbortSignal.timeout(1000),
      ),
    ).rejects.toThrow("Provider is unavailable");
    expect(chat).toHaveBeenCalledTimes(1);
  });
});

it("preserves evidence limits and empty strengths without inventing praise", () => {
  const result = coachResponseSchema.parse({
    reply: "A clearer view is needed.",
    feedback: { doingWell: [], improve: [], limitations: ["The feet are cropped at 1.2 seconds."] },
    drill: { title: "Recording setup", instructions: "Use a stationary side view.", steps: ["Place the camera on a stable support.", "Check that your full body is in view."] },
  });
  expect(result.feedback?.doingWell).toEqual([]);
  expect(result.feedback?.limitations).toEqual(["The feet are cropped at 1.2 seconds."]);
  expect(result.drill?.steps).toHaveLength(2);
  expect(coachResponseSchema.safeParse({ reply: "Try again", drill: { title: "Practice", instructions: "Start slowly.", steps: [] } }).success).toBe(false);
});
it("continues accepting an earlier instruction-only drill", () => {
  const result = coachResponseSchema.parse({ reply: "Try this practice.", drill: { title: "Balance", instructions: "Pause before resetting." } });
  expect(result.drill?.steps).toBeUndefined();
});

it("rejects repeated checklist goals so each check remains independent", () => {
  expect(coachResponseSchema.safeParse({
    reply: "Try this practice.",
    drill: { title: "Balance", instructions: "Pause comfortably.", steps: ["Hold for two seconds.", "Hold for two seconds."] },
  }).success).toBe(false);
});
