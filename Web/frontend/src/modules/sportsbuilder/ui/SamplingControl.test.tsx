// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SamplingControl } from "./SamplingControl";
afterEach(cleanup);
it("keeps exact sampling intervals while pointer feedback moves between the valid steps", () => {
  const change = vi.fn();
  render(<SamplingControl interval={0.1} onChange={change} />);
  const slider = screen.getByRole("slider", { name: "Frame sampling rate" }) as HTMLInputElement;
  expect([slider.min, slider.max, slider.step, slider.value]).toEqual(["0.05", "2", "0.05", "0.1"]);
  slider.getBoundingClientRect = () => ({ left: 0, width: 400 } as DOMRect);
  Object.assign(slider, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() });
  fireEvent(slider, new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 200 }));
  fireEvent(slider, new MouseEvent("pointermove", { bubbles: true, clientX: 201 }));
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(slider, { target: { value: "0.45" } });
  expect(change).toHaveBeenCalledWith(0.45);
  fireEvent(slider, new MouseEvent("pointerup", { bubbles: true }));
});
