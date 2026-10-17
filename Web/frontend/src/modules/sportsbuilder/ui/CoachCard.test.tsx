// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sampleTool as config } from "../../../../../shared";
import { api } from "../services/api";
import { CoachCard } from "./CoachCard";
const sampleTool = { ...config, id: "test-coach", createdAt: "2026-10-17T12:00:00Z" };
vi.mock("../services/api", () => ({ api: vi.fn() }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function setup() {
  const callbacks = { onOpen: vi.fn(), onRenamed: vi.fn(), onDeleted: vi.fn() };
  render(<CoachCard tool={sampleTool} {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: `Options for ${sampleTool.name}` }));
  return callbacks;
}
it("opens the options independently, supports keyboard dismissal, and renames the saved coach", async () => {
  const callbacks = setup();
  expect(callbacks.onOpen).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: `Options for ${sampleTool.name}` }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Coach name" }), { target: { value: "  My coach  " } });
  vi.mocked(api).mockResolvedValue({ ...sampleTool, name: "My coach" });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() => expect(callbacks.onRenamed).toHaveBeenCalledWith({ ...sampleTool, name: "My coach" }));
  expect(api).toHaveBeenCalledWith(`/api/tools/${sampleTool.id}`, { method: "PATCH", body: JSON.stringify({ name: "My coach" }) });
});
it("confirms deletion and preserves the tile when saving fails", async () => {
  const callbacks = setup();
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
  expect(api).not.toHaveBeenCalled();
  vi.mocked(api).mockRejectedValueOnce(Error("Please try again."));
  fireEvent.click(screen.getByRole("button", { name: "Delete coach" }));
  await screen.findByText("Please try again.");
  expect(callbacks.onDeleted).not.toHaveBeenCalled();
  vi.mocked(api).mockResolvedValueOnce({ deleted: true });
  fireEvent.click(screen.getByRole("button", { name: "Delete coach" }));
  await waitFor(() => expect(callbacks.onDeleted).toHaveBeenCalledOnce());
  expect(api).toHaveBeenLastCalledWith(`/api/tools/${sampleTool.id}`, { method: "DELETE" });
});
