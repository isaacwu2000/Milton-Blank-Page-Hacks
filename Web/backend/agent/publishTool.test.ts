import { afterEach, expect, it, vi } from "vitest";
import { publishReviewedTool } from "./services/publishTool";
import { sampleTool } from "../../shared";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("retries a lost save response with the same reviewed-tool identity", async () => {
  vi.stubEnv("AGENT_INTERNAL_SECRET", "test-secret");
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(
      new DOMException("The operation timed out.", "TimeoutError"),
    )
    .mockResolvedValueOnce(
      Response.json({ ...sampleTool, id: "build-job", createdAt: "now" }),
    );
  vi.stubGlobal("fetch", fetcher);
  const tool = await publishReviewedTool(sampleTool, "build-job");
  expect(tool.id).toBe("build-job");
  expect(fetcher).toHaveBeenCalledTimes(2);
  for (const [, init] of fetcher.mock.calls) {
    expect(init.headers["x-agent-job-id"]).toBe("build-job");
    expect(JSON.parse(init.body)).toEqual(sampleTool);
  }
});

it("reports a save timeout with a useful recovery message", async () => {
  vi.stubEnv("AGENT_INTERNAL_SECRET", "test-secret");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockRejectedValue(
        new DOMException("The operation timed out.", "TimeoutError"),
      ),
  );
  await expect(publishReviewedTool(sampleTool, "build-job")).rejects.toThrow(
    "Saving your reviewed coach timed out",
  );
});

it("does not retry rejected credentials", async () => {
  vi.stubEnv("AGENT_INTERNAL_SECRET", "test-secret");
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { detail: "Tools must be created by the builder." },
        { status: 403 },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  await expect(publishReviewedTool(sampleTool, "build-job")).rejects.toThrow(
    "builder",
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
