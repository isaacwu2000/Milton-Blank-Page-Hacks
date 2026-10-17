// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Analysis } from "../../../../../shared";
import { Player } from "./Player";
const data: Analysis = {
  id: "clock",
  width: 400,
  height: 300,
  duration: 5,
  interval: 0.1,
  ground: 250,
  source: "video",
  frames: [{ time: 0, joints: {} }],
  model: "controlled clock fixture",
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("does not seek backward when a delayed React echo follows newer native playback ticks", () => {
  let frame!: FrameRequestCallback;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback) => {
      frame = callback;
      return 1;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const report = vi.fn();
  const props = {
    analysis: data,
    url: "fixture.mp4",
    onTime: report,
    joint: "right_wrist" as const,
    onJoint: vi.fn(),
    ground: 250,
    seekRevision: 0,
  };
  const view = render(<Player {...props} time={0} />);
  const video = view.container.querySelector("video")!;
  let nativeTime = 0;
  const seeks = vi.fn((value: number) => {
    nativeTime = value;
  });
  Object.defineProperties(video, {
    readyState: { configurable: true, value: 4 },
    paused: { configurable: true, value: false },
    seeking: { configurable: true, value: false },
    currentTime: { configurable: true, get: () => nativeTime, set: seeks },
  });
  fireEvent.play(video);
  nativeTime = 1.1;
  act(() => frame(1100));
  nativeTime = 1.2;
  act(() => frame(1200));
  expect(report.mock.calls.map(([value]) => value)).toEqual([1.1, 1.2]);
  // Rendering expensive plots can commit an earlier clock report after a newer tick.
  view.rerender(<Player {...props} time={1.1} />);
  expect(seeks).not.toHaveBeenCalled();
  expect(nativeTime).toBe(1.2);
  // An explicit timeline/plot seek still takes effect, even while the video plays.
  view.rerender(<Player {...props} time={2.5} seekRevision={1} />);
  expect(seeks).toHaveBeenCalledExactlyOnceWith(2.5);
});
it("does not flash loading for a short native wait but announces a sustained buffer stall", () => {
  vi.useFakeTimers();
  const view = render(
    <Player
      analysis={data}
      url="fixture.mp4"
      time={0}
      onTime={vi.fn()}
      joint="right_wrist"
      onJoint={vi.fn()}
      ground={250}
    />,
  );
  const video = view.container.querySelector("video")!;
  fireEvent.loadedData(video);
  fireEvent.waiting(video);
  act(() => vi.advanceTimersByTime(50));
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.playing(video);
  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.waiting(video);
  act(() => vi.advanceTimersByTime(200));
  expect(screen.getByRole("status").textContent).toContain("Loading video");
  fireEvent.canPlay(video);
  expect(screen.queryByRole("status")).toBeNull();
});
