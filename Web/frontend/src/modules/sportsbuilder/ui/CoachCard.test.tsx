// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { sampleTool, type SavedTool } from "../../../../../shared";
import { api } from "../services/api";
import { CoachCard } from "./CoachCard";
vi.mock("../services/api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const tool: SavedTool = {
  ...sampleTool,
  id: "coach",
  createdAt: "2026-10-17T12:00:00Z",
};
function setup() {
  const onUpdated = vi.fn();
  render(<CoachCard tool={tool} onUpdated={onUpdated} />);
  return {
    onUpdated,
    trigger: screen.getByRole("button", { name: `Options for ${tool.name}` }),
  };
}
function rename() {
  fireEvent.click(
    screen.getByRole("button", { name: `Options for ${tool.name}` }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
  return screen.getByRole("textbox", {
    name: "Coach name",
  }) as HTMLInputElement;
}
it("uses a keyboard menu with Pencil/Trash actions, wrapping navigation, Escape and outside dismissal", () => {
  const { trigger } = setup();
  fireEvent.keyDown(trigger, { key: "ArrowUp" });
  const deletion = screen.getByRole("menuitem", { name: "Delete" });
  const rename = screen.getByRole("menuitem", { name: "Rename" });
  expect(document.activeElement).toBe(deletion);
  expect(rename.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(deletion.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
    "true",
  );
  fireEvent.keyDown(deletion, { key: "ArrowDown" });
  expect(document.activeElement).toBe(rename);
  fireEvent.keyDown(rename, { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("menu")).toBeNull();
});
it("focuses and selects the current name, cancels without saving, and blocks whitespace-only names", () => {
  const { trigger } = setup();
  const input = rename();
  expect(document.activeElement).toBe(input);
  expect(input.selectionStart).toBe(0);
  expect(input.selectionEnd).toBe(tool.name.length);
  fireEvent.change(input, { target: { value: "   " } });
  expect(
    (screen.getByRole("button", { name: "Save name" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(api).not.toHaveBeenCalled();
});
it("saves a trimmed name once while pending and preserves the returned full coach", async () => {
  let finish!: (saved: SavedTool) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { onUpdated, trigger } = setup();
  fireEvent.change(rename(), { target: { value: "  Slow elbow practice  " } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  expect(screen.getByRole("status").textContent).toBe("Saving coach name…");
  expect((trigger as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Saving…" }));
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith("/api/tools/coach", {
    method: "PATCH",
    body: JSON.stringify({ name: "Slow elbow practice" }),
  });
  const saved = { ...tool, name: "Slow elbow practice" };
  await act(async () => {
    finish(saved);
  });
  expect(onUpdated).toHaveBeenCalledWith(saved);
  expect(document.activeElement).toBe(trigger);
});
it("keeps a failed rename draft for retry", async () => {
  vi.mocked(api).mockRejectedValueOnce(Error("Could not save the name"));
  const { onUpdated } = setup();
  fireEvent.change(rename(), { target: { value: "My coach" } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Could not save the name",
  );
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
    "My coach",
  );
  expect(onUpdated).not.toHaveBeenCalled();
});
it("deletes through the existing hide endpoint and retains the historical payload", async () => {
  vi.mocked(api).mockResolvedValue({ ...tool, hidden: true });
  const { onUpdated, trigger } = setup();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
  await waitFor(() =>
    expect(onUpdated).toHaveBeenCalledWith({ ...tool, hidden: true }),
  );
  expect(api).toHaveBeenCalledWith("/api/tools/coach", { method: "DELETE" });
});
it("reports a failed delete and leaves the card available for retry", async () => {
  vi.mocked(api).mockRejectedValue(Error("Could not delete the coach"));
  const { onUpdated, trigger } = setup();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
  await screen.findByRole("alert");
  expect(onUpdated).not.toHaveBeenCalled();
  expect((trigger as HTMLButtonElement).disabled).toBe(false);
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
});
