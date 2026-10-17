import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveBuildBrief } from "./services/buildBrief";

const draft = {
  name: "Squat coach",
  sport: "Strength training",
  audience: "Assumed: general adult beginner",
  rubric:
    "Assumed: comfortable controlled movement; do not infer injury or score unobservable alignment.",
  metrics: ["Knee angle"],
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("building before the interview is complete", () => {
  it("derives a validated brief from the current conversation with the configured model", async () => {
    vi.stubEnv("SOL_PROVIDER", "chatgpt");
    const fetcher = vi.fn(async (_url: unknown, _init?: RequestInit) =>
      Response.json({
        status: "completed",
        output: [
          {
            type: "function_call",
            call_id: "brief-1",
            name: "build_brief",
            arguments: JSON.stringify(draft),
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      resolveBuildBrief(
        undefined,
        [
          {
            role: "user",
            content:
              "Make a squat coach; I have not answered the other questions yet.",
          },
        ],
        AbortSignal.timeout(1000),
      ),
    ).resolves.toEqual(draft);
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(JSON.stringify(request)).toContain("Make a squat coach");
    expect(request.reasoning.effort).toBe("medium");
  });
  it("preserves a supplied brief without another model call", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      resolveBuildBrief(
        draft,
        [{ role: "user", content: "Build it." }],
        AbortSignal.timeout(1000),
      ),
    ).resolves.toEqual(draft);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects incomplete model output before it can reach the build sandbox", async () => {
    vi.stubEnv("SOL_PROVIDER", "chatgpt");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "completed",
          output: [
            {
              type: "function_call",
              call_id: "brief-2",
              name: "build_brief",
              arguments: JSON.stringify({ ...draft, metrics: [] }),
            },
          ],
        }),
      ),
    );
    await expect(
      resolveBuildBrief(
        undefined,
        [{ role: "user", content: "Build a squat coach." }],
        AbortSignal.timeout(1000),
      ),
    ).rejects.toThrow();
  });
});
