// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Chart } from "./Player";

beforeEach(() => {
  class Pointer extends MouseEvent {
    pointerId: number;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  vi.stubGlobal("PointerEvent", Pointer);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function graph(time = 0) {
  const seek = vi.fn();
  render(<Chart times={[0, 0.2, 0.7, 2]} values={[1, 2, null, 4]} time={time} onTime={seek} label="Speed" unit="m/s" />);
  const chart = screen.getByRole("slider", { name: "Speed seek time" });
  // Half-scale rendering: plot x=48..688 maps to client x=124..444.
  vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({ left: 100, top: 0, width: 360, height: 95 } as DOMRect);
  const capture = vi.fn(), release = vi.fn();
  Object.assign(chart, { setPointerCapture: capture, releasePointerCapture: release, hasPointerCapture: () => true });
  return { chart, seek, capture, release };
}

it("drags right and left continuously using actual timestamps and scaled plot bounds", () => {
  const { chart, seek, capture, release } = graph();
  fireEvent.pointerDown(chart, { pointerId: 8, button: 0, clientX: 204 });
  fireEvent.pointerMove(chart, { pointerId: 8, clientX: 364 });
  fireEvent.pointerMove(chart, { pointerId: 8, clientX: 124 });
  fireEvent.pointerMove(chart, { pointerId: 8, clientX: 900 });
  fireEvent.pointerMove(chart, { pointerId: 8, clientX: -100 });
  expect(seek.mock.calls.map(([time]) => time)).toEqual([0.5, 1.5, 0, 2, 0]);
  expect(capture).toHaveBeenCalledWith(8);
  fireEvent.pointerUp(chart, { pointerId: 8 });
  const count = seek.mock.calls.length;
  fireEvent.pointerMove(chart, { pointerId: 8, clientX: 300 });
  expect(seek).toHaveBeenCalledTimes(count);
  expect(release).toHaveBeenCalledWith(8);
});

it("ignores other pointers and stops seeking after cancellation or lost capture", () => {
  const { chart, seek } = graph();
  fireEvent.pointerDown(chart, { pointerId: 1, button: 2, clientX: 300 });
  expect(seek).not.toHaveBeenCalled();
  fireEvent.pointerDown(chart, { pointerId: 1, button: 0, clientX: 124 });
  fireEvent.pointerMove(chart, { pointerId: 2, clientX: 444 });
  expect(seek).toHaveBeenCalledTimes(1);
  fireEvent.pointerCancel(chart, { pointerId: 1 });
  fireEvent.pointerMove(chart, { pointerId: 1, clientX: 444 });
  expect(seek).toHaveBeenCalledTimes(1);
  fireEvent.pointerDown(chart, { pointerId: 3, button: 0, clientX: 124 });
  fireEvent.lostPointerCapture(chart, { pointerId: 3 });
  fireEvent.pointerMove(chart, { pointerId: 3, clientX: 444 });
  expect(seek).toHaveBeenCalledTimes(2);
  expect(chart.style.touchAction).toBe("pan-y");
});

it("offers keyboard seeking by measured timestamps and timeline endpoints", () => {
  const { chart, seek } = graph(0.4);
  fireEvent.keyDown(chart, { key: "ArrowRight" });
  fireEvent.keyDown(chart, { key: "ArrowLeft" });
  fireEvent.keyDown(chart, { key: "Home" });
  fireEvent.keyDown(chart, { key: "End" });
  expect(seek.mock.calls.map(([time]) => time)).toEqual([0.7, 0.2, 0, 2]);
  expect(chart.getAttribute("aria-valuenow")).toBe("0.4");
});

it("seeks against the visible plot when a wide SVG is letterboxed", () => {
  const { chart, seek } = graph();
  vi.mocked(chart.getBoundingClientRect).mockReturnValue({ left: 100, top: 0, width: 720, height: 95 } as DOMRect);
  fireEvent.pointerDown(chart, { pointerId: 1, button: 0, clientX: 464 });
  expect(seek).toHaveBeenLastCalledWith(1);
});

it("keeps an empty timeline at zero instead of inventing a one-second recording", () => {
  const seek = vi.fn();
  render(<Chart times={[]} values={[]} time={0} onTime={seek} label="Empty" unit="m/s" />);
  const chart = screen.getByRole("slider", { name: "Empty seek time" });
  fireEvent.keyDown(chart, { key: "End" });
  expect(seek).toHaveBeenCalledWith(0);
  expect(chart.getAttribute("aria-valuemax")).toBe("0");
});
