// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api, post } from "../services/api";
import { SessionWorkspace } from "./Analysis";
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const session = { id: "practice", name: "Practice", status: "processing", progress: 0.25 };

it("cancels active movement tracking through the X and returns without deleting the clip", async () => {
  vi.mocked(api).mockImplementation(async (path) => path.endsWith("/video") ? { url: "private" } : session);
  vi.mocked(post).mockResolvedValue({ ...session, status: "uploaded" });
  const onBack = vi.fn();
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={onBack} />);
  const cancel = await screen.findByRole("button", { name: "Cancel analysis" });
  fireEvent.click(cancel);
  await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
  expect(post).toHaveBeenCalledWith("/api/sessions/practice/cancel", {});
  expect(vi.mocked(api).mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
});

it("closes a finished recording that is still loading without cancelling or deleting it", async () => {
  vi.mocked(api).mockImplementation((path) => path === "/api/sessions/practice"
    ? Promise.resolve({ ...session, status: "complete" })
    : new Promise(() => {}));
  const onBack = vi.fn();
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={onBack} />);
  fireEvent.click(await screen.findByRole("button", { name: "Close video loading" }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(post).not.toHaveBeenCalled();
});

it("shows a cancellation failure and lets the user retry", async () => {
  vi.mocked(api).mockImplementation(async (path) => path.endsWith("/video") ? { url: "private" } : session);
  vi.mocked(post).mockRejectedValueOnce(Error("Unable to stop analysis")).mockResolvedValueOnce({ ...session, status: "uploaded" });
  const onBack = vi.fn();
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={onBack} />);
  fireEvent.click(await screen.findByRole("button", { name: "Cancel analysis" }));
  await screen.findByText("Unable to stop analysis");
  expect(onBack).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel analysis" }));
  await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
});

it("keeps cancellation visibly pending and prevents duplicate cancellation requests", async () => {
  vi.mocked(api).mockImplementation(async (path) => path.endsWith("/video") ? { url: "private" } : session);
  let finish!: (result: unknown) => void;
  vi.mocked(post).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const onBack = vi.fn();
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={onBack} />);
  const cancel = await screen.findByRole("button", { name: "Cancel analysis" }) as HTMLButtonElement;
  fireEvent.click(cancel);
  expect(cancel.disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Cancelling analysis");
  fireEvent.click(cancel);
  expect(post).toHaveBeenCalledTimes(1);
  finish({ status: "uploaded" });
  await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
});

it("shows loading activity while the saved recording has not arrived", () => {
  vi.mocked(api).mockReturnValue(new Promise(() => {}));
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={() => {}} />);
  expect(screen.getByRole("status").textContent).toContain("Loading your video");
});
it("shows a pending analysis start and prevents starting twice", async () => {
  vi.mocked(api).mockImplementation(async (path) => path.endsWith("/video") ? { url: "private" } : { ...session, status: "uploaded" });
  vi.mocked(post).mockReturnValue(new Promise(() => {}));
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Analyze video" }));
  expect(screen.getByRole("status").textContent).toContain("Starting analysis");
  expect((screen.getByRole("button", { name: "Starting analysis…" }) as HTMLButtonElement).disabled).toBe(true);
  expect(post).toHaveBeenCalledTimes(1);
});

it("retries reading completed analysis without starting tracking again", async () => {
  let analysisReads = 0;
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.endsWith("/video")) return { url: "private" };
    if (path.endsWith("/analysis")) {
      if (++analysisReads === 1) throw Error("Analysis could not be loaded");
      return { frames: [] };
    }
    return { ...session, status: "complete" };
  });
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={() => {}} />);
  await screen.findByText("Analysis could not be loaded");
  fireEvent.click(screen.getByRole("button", { name: "Retry loading analysis" }));
  await screen.findByText("Coaching tool unavailable");
  expect(analysisReads).toBe(2);
  expect(post).not.toHaveBeenCalled();
});

it("recovers from a failed status read instead of permanently stopping progress", async () => {
  vi.useFakeTimers();
  try {
    let statusReads = 0;
    vi.mocked(api).mockImplementation(async (path) => {
      if (path.endsWith("/video")) return { url: "private" };
      if (++statusReads === 2) throw Error("Connection interrupted");
      return { ...session, status: statusReads > 2 ? "failed" : "processing", error: "Try another analysis" };
    });
    render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={() => {}} />);
    const { act } = await import("@testing-library/react");
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(screen.getByRole("button", { name: "Analyze video" })).toBeTruthy();
    expect(screen.queryByText("Connection interrupted")).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

it("can start failed tracking again after a rejected start request", async () => {
  let status = "failed";
  vi.mocked(api).mockImplementation(async (path) => path.endsWith("/video") ? { url: "private" } : { ...session, status });
  vi.mocked(post).mockRejectedValueOnce(Error("Service unavailable")).mockImplementationOnce(async () => {
    status = "processing";
    return { ...session, status };
  });
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Analyze video" }));
  await screen.findByText("Service unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Analyze video" }));
  await screen.findByRole("progressbar", { name: "Video analysis progress" });
  expect(post).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Service unavailable")).toBeNull();
});

it("ignores an old recording response after navigating to another recording", async () => {
  let finishOld!: (value: unknown) => void;
  vi.mocked(api).mockImplementation((path) => {
    if (path.endsWith("/video")) return Promise.resolve({ url: "private" });
    if (path.endsWith("/practice")) return new Promise((resolve) => { finishOld = resolve; });
    return Promise.resolve({ ...session, id: "new", name: "New recording", status: "uploaded" });
  });
  const props = { data: { profiles: [], sessions: [], tools: [] }, onBack: () => {} };
  const view = render(<SessionWorkspace sessionId="practice" {...props} />);
  view.rerender(<SessionWorkspace sessionId="new" {...props} />);
  await screen.findByText("New recording");
  const { act } = await import("@testing-library/react");
  await act(async () => finishOld({ ...session, status: "failed", name: "Old recording" }));
  expect(screen.getByText("New recording")).toBeTruthy();
  expect(screen.queryByText("Old recording")).toBeNull();
});

it("explains a worker still finishing and lets the interrupted recording start on the next retry", async () => {
  let status = "failed";
  vi.mocked(api).mockImplementation(async (path) => path.endsWith("/video") ? { url: "private" } : {
    ...session, status, error: status === "failed" ? "Analysis was interrupted. Retry this video." : null,
  });
  vi.mocked(post).mockRejectedValueOnce(Error("The previous analysis is finishing. Retry in a moment."))
    .mockImplementationOnce(async () => {
      status = "queued";
      return { ...session, status, error: null };
    });
  render(<SessionWorkspace sessionId="practice" data={{ profiles: [], sessions: [], tools: [] }} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Analyze video" }));
  await screen.findByText("The previous analysis is finishing. Retry in a moment.");
  fireEvent.click(screen.getByRole("button", { name: "Analyze video" }));
  await screen.findByRole("progressbar", { name: "Video analysis progress" });
  expect(screen.queryByText("The previous analysis is finishing. Retry in a moment.")).toBeNull();
  expect(screen.queryByText("Analysis was interrupted. Retry this video.")).toBeNull();
  expect(post).toHaveBeenCalledTimes(2);
});
