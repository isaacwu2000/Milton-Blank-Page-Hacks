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
const evidenceLimits = { doingWell: [], improve: [], limitations: ["The camera view does not show the whole movement; record a full-body side view."] };
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
      content: JSON.stringify({ reply: "At 1.2 seconds, your knee bends.", feedback: evidenceLimits, drill: null }),
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
      feedback: evidenceLimits,
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
  expect(coachResponseSchema.safeParse({ reply: "Try again", feedback: evidenceLimits, drill: { title: "Practice", instructions: "Start slowly.", steps: [] } }).success).toBe(false);
});
it("continues accepting an earlier instruction-only drill", () => {
  const result = coachResponseSchema.parse({ reply: "Try this practice.", feedback: evidenceLimits, drill: { title: "Balance", instructions: "Pause before resetting." } });
  expect(result.drill?.steps).toBeUndefined();
});

it("rejects repeated exercise steps", () => {
  expect(coachResponseSchema.safeParse({
    reply: "Try this practice.", feedback: evidenceLimits,
    drill: { title: "Balance", instructions: "Pause comfortably.", steps: ["Hold for two seconds.", "Hold for two seconds."] },
  }).success).toBe(false);
});
it("removes leading checklist glyphs before checking for duplicate steps", () => {
  const result = coachResponseSchema.parse({ reply: "Try this.", feedback: evidenceLimits, drill: { title: "Practice", instructions: "Move comfortably.", steps: ["☐ Hold for two seconds.", "- [ ] Reset your stance."] } });
  expect(result.drill?.steps).toEqual(["Hold for two seconds.", "Reset your stance."]);
  expect(coachResponseSchema.safeParse({ reply: "Try this.", feedback: evidenceLimits, drill: { title: "Practice", instructions: "Move comfortably.", steps: ["☐ Hold for two seconds.", "Hold for two seconds."] } }).success).toBe(false);
});

it("does not accept a fresh reply-only review or empty evidence sections", () => {
  expect(coachResponseSchema.safeParse({ reply: "Keep practising!" }).success).toBe(false);
  expect(coachResponseSchema.safeParse({ reply: "Keep practising!", feedback: { doingWell: [], improve: [], limitations: [] } }).success).toBe(false);
  expect(coachResponseSchema.safeParse({ reply: "Keep practising!", feedback: { doingWell: ["   "], improve: [], limitations: [] } }).success).toBe(false);
});

it("repairs a generic reply-only review with explicit evidence limits instead of inventing form feedback", async () => {
  const feedback = { doingWell: [], improve: [], limitations: ["At 0 seconds, the cropped image does not show your knee; record a full-body side view to assess knee position."] };
  vi.mocked(chat).mockResolvedValueOnce({ role: "assistant", content: JSON.stringify({ reply: "Keep practising!" }) })
    .mockResolvedValueOnce({ role: "assistant", content: JSON.stringify({ reply: "The knee is outside the view.", feedback }) });
  const response = await structured(messages, { ...tool, name: "coach_response" }, coachResponseSchema, AbortSignal.timeout(1000));
  expect(response.feedback).toEqual(feedback);
  expect(chat).toHaveBeenCalledTimes(2);
});
