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
