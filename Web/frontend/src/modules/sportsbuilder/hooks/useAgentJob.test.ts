// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { POLLING } from "../config";
import { useAgentJob } from "./useAgentJob";
vi.mock("../services/api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("agent job polling", () => {
  it("polls a running job to completion and stops requesting status", async () => {
    vi.useFakeTimers();
    vi.mocked(api)
      .mockResolvedValueOnce({ status: "running" })
      .mockResolvedValueOnce({ status: "complete", reply: "Ready" });
    const done = vi.fn(),
      failed = vi.fn();
    renderHook(() => useAgentJob("one", done, failed));
    await act(async () => {});
    expect(api).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLING.agentJobMs);
    });
    expect(done).toHaveBeenCalledWith({ status: "complete", reply: "Ready" });
    expect(failed).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLING.agentJobMs * 3);
    });
    expect(api).toHaveBeenCalledTimes(2);
  });
  it("ignores an old in-flight completion after the selected job changes", async () => {
    let finishOld!: (value: unknown) => void;
    const old = new Promise((resolve) => {
      finishOld = resolve;
    });
    vi.mocked(api)
      .mockReturnValueOnce(old)
      .mockResolvedValueOnce({ status: "complete", reply: "New tool" });
    const done = vi.fn(),
      failed = vi.fn();
    const hook = renderHook(({ id }) => useAgentJob(id, done, failed), {
      initialProps: { id: "old" },
    });
    hook.rerender({ id: "new" });
    await act(async () => {
      finishOld({ status: "complete", reply: "Old tool" });
    });
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith({
      status: "complete",
      reply: "New tool",
    });
    expect(failed).not.toHaveBeenCalled();
  });
});
