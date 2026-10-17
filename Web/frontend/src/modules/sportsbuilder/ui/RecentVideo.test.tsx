// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Session } from "../../../../../shared";
import { api } from "../services/api";
import { RecentVideo } from "./RecentVideo";
vi.mock("../services/api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
const session = {
  id: "clip",
  name: "jump.mp4",
  duration: 12,
  createdAt: "2026-10-17T12:00:00Z",
  status: "complete",
} as Session;
it("deletes only the confirmed clip without opening its analysis", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.mocked(api).mockResolvedValue({});
  const onOpen = vi.fn(),
    onDeleted = vi.fn();
  render(
    <RecentVideo session={session} onOpen={onOpen} onDeleted={onDeleted} />,
  );
  const open = screen.getByRole("button", { name: "Open jump.mp4" });
  expect(open.querySelector("button")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Delete jump.mp4" }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("clip"));
  expect(api).toHaveBeenCalledWith("/api/sessions/clip", { method: "DELETE" });
  expect(onOpen).not.toHaveBeenCalled();
});
it("retains a clip when confirmation is declined", () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <RecentVideo session={session} onOpen={vi.fn()} onDeleted={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete jump.mp4" }));
  expect(api).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Open jump.mp4" })).toBeTruthy();
});
it("announces a pending delete and restores retry after a failure", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  let reject!: (error: Error) => void;
  vi.mocked(api)
    .mockReturnValueOnce(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    )
    .mockResolvedValue({});
  const onDeleted = vi.fn();
  render(
    <RecentVideo session={session} onOpen={vi.fn()} onDeleted={onDeleted} />,
  );
  const remove = screen.getByRole("button", {
    name: "Delete jump.mp4",
  }) as HTMLButtonElement;
  fireEvent.click(remove);
  expect(remove.disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Deleting jump.mp4");
  reject(Error("Could not delete this video."));
  await screen.findByText("Could not delete this video.");
  expect(remove.disabled).toBe(false);
  expect(onDeleted).not.toHaveBeenCalled();
  fireEvent.click(remove);
  await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("clip"));
});
