// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BuilderColumns } from "./BuilderColumns";
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 1000,
  } as DOMRect);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("starts compact and bounds keyboard resizing while remembering the chosen width", () => {
  const { unmount } = render(
    <BuilderColumns>
      <div>Conversation</div>
      <aside>Summary</aside>
    </BuilderColumns>,
  );
  const handle = screen.getByRole("separator", {
    name: "Resize builder summary",
  });
  expect(handle.getAttribute("aria-valuenow")).toBe("280");
  fireEvent.keyDown(handle, { key: "ArrowLeft" });
  expect(handle.getAttribute("aria-valuenow")).toBe("304");
  fireEvent.keyDown(handle, { key: "End" });
  expect(handle.getAttribute("aria-valuenow")).toBe("560");
  fireEvent.keyDown(handle, { key: "Home" });
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  expect(handle.getAttribute("aria-valuenow")).toBe("240");
  fireEvent.keyDown(handle, { key: "ArrowLeft" });
  unmount();
  render(
    <BuilderColumns>
      <div>Conversation</div>
      <aside>Summary</aside>
    </BuilderColumns>,
  );
  expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(
    "264",
  );
});
it("widens the summary when dragged left and releases pointer capture", () => {
  render(
    <BuilderColumns>
      <div>Conversation</div>
      <aside>Summary</aside>
    </BuilderColumns>,
  );
  const handle = screen.getByRole("separator");
  handle.setPointerCapture = vi.fn();
  handle.hasPointerCapture = vi.fn().mockReturnValue(true);
  handle.releasePointerCapture = vi.fn();
  function pointer(type: string, x: number) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { button: 0, clientX: x, pointerId: 1 });
    fireEvent(handle, event);
  }
  pointer("pointerdown", 700);
  pointer("pointermove", 620);
  expect(handle.getAttribute("aria-valuenow")).toBe("360");
  pointer("pointerup", 620);
  expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
  pointer("pointermove", 400);
  expect(handle.getAttribute("aria-valuenow")).toBe("360");
});
