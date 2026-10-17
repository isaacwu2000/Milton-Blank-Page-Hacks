import { afterEach, expect, it, vi } from "vitest";
import { api, post } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("recovers a read after a temporary empty proxy 500 during backend startup", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 500 }))
    .mockResolvedValueOnce(Response.json({ tools: ["saved"] }));
  vi.stubGlobal("fetch", fetcher);
  const reading = api("/api/home");
  await vi.runAllTimersAsync();
  await expect(reading).resolves.toEqual({ tools: ["saved"] });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("does not retry mutations which could create duplicate records", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(post("/api/upload", {})).rejects.toThrow(
    /temporarily unavailable/,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("stops retrying failed reads and explains service availability", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 502 }));
  vi.stubGlobal("fetch", fetcher);
  const reading = api("/api/home").catch((error: Error) => error);
  await vi.runAllTimersAsync();
  expect(((await reading) as Error).message).toMatch(/temporarily unavailable/);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
it("preserves a valid backend error without retrying invalid user requests", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ detail: "Video is too long." }, { status: 422 }),
    );
  vi.stubGlobal("fetch", fetcher);
  await expect(api("/api/video")).rejects.toThrow("Video is too long.");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
