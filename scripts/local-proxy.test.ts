import { afterEach, expect, it, vi } from "vitest";
import { ensureLocalProxy } from "./local-proxy";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("reuses a running proxy without starting a duplicate", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ data: [] })),
  );
  const start = vi.fn();
  await ensureLocalProxy(start);
  expect(start).not.toHaveBeenCalled();
});

it("waits for a newly started proxy before releasing app startup", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("Connection refused"))
    .mockResolvedValueOnce(new Response("Starting", { status: 503 }))
    .mockResolvedValue(Response.json({ data: [] }));
  vi.stubGlobal("fetch", fetcher);
  const start = vi.fn();
  let ready = false;
  const startup = ensureLocalProxy(start).then(() => {
    ready = true;
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(start).toHaveBeenCalledTimes(1);
  expect(ready).toBe(false);
  await vi.runAllTimersAsync();
  await startup;
  expect(ready).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it("bounds startup failure and explains how to recover", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Connection refused")),
  );
  const startup = ensureLocalProxy(vi.fn()).catch((error: Error) => error);
  await vi.runAllTimersAsync();
  expect(await startup).toMatchObject({
    message: expect.stringMatching(/sign-in.*retry/i),
  });
});
