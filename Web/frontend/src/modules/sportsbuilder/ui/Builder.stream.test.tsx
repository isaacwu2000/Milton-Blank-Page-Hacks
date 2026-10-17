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
import { Builder } from "./Builder";
import { streamBuilder, type BuilderEvent } from "../services/builderStream";
import { post } from "../services/api";
import { sampleTool } from "../../../../../shared";
vi.mock("../services/builderStream", () => ({ streamBuilder: vi.fn() }));
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("shows streamed text, permits a follow-up, and ignores the superseded completion", async () => {
  const turns: {
    emit: (event: BuilderEvent) => void;
    signal: AbortSignal;
    finish: () => void;
  }[] = [];
  vi.mocked(streamBuilder).mockImplementation(
    (_turn, emit, signal) =>
      new Promise<void>((finish) => turns.push({ emit, signal, finish })),
  );
  render(
    <Builder onClose={vi.fn()} onBuilt={vi.fn()} initialTool={sampleTool} />,
  );
  const input = screen.getByRole("textbox", { name: "Answer the builder" });
  fireEvent.change(input, { target: { value: "Make it gentler" } });
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
  await waitFor(() => expect(turns).toHaveLength(1));
  act(() =>
    turns[0].emit({ type: "text", text: "I’ll adjust the coaching cues." }),
  );
  expect(screen.getByText("I’ll adjust the coaching cues.")).toBeTruthy();
  expect(input.hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("heading", { name: sampleTool.name })).toBeTruthy();
  fireEvent.change(input, { target: { value: "Also call it My coach" } });
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
  expect(turns[0].signal.aborted).toBe(true);
  await act(async () => {
    turns[0].emit({
      type: "complete",
      reply: "Old",
      ready: false,
      preview: { ...sampleTool, name: "Stale coach" },
      id: "stale",
      revision: 2,
    });
    turns[0].finish();
  });
  expect(screen.queryByRole("heading", { name: "Stale coach" })).toBeNull();
  await act(async () => {
    turns[1].emit({
      type: "complete",
      reply: "Updated",
      ready: false,
      preview: { ...sampleTool, name: "My coach" },
      id: "latest",
      revision: 2,
    });
    turns[1].finish();
  });
  expect(screen.getByRole("heading", { name: "My coach" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Save coach" }).hasAttribute("disabled"),
  ).toBe(false);
  vi.mocked(post).mockResolvedValueOnce({
    ...sampleTool,
    name: "My coach",
    id: "saved",
  });
  fireEvent.click(screen.getByRole("button", { name: "Save coach" }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith("/agent/jobs/latest/save", {}),
  );
});
