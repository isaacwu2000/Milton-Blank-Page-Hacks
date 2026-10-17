// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferenceVideo } from "./ReferenceVideo";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("reference playback without pose analysis", () => {
  it("accepts manual starting-frame seeks and linked playback using video time alone", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => {});
    const onTime = vi.fn(),
      onDuration = vi.fn();
    const view = render(
      <ReferenceVideo
        url="http://localhost/reference.mp4"
        time={0.75}
        onTime={onTime}
        onDuration={onDuration}
      />,
    );
    const video = view.container.querySelector("video")!;
    Object.defineProperty(video, "duration", { configurable: true, value: 5 });
    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: 1,
    });
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(0.75);
    expect(onDuration).toHaveBeenCalledWith(5);
    view.rerender(
      <ReferenceVideo
        url="http://localhost/reference.mp4"
        time={1.25}
        playing={true}
        onTime={onTime}
        onDuration={onDuration}
      />,
    );
    expect(video.currentTime).toBe(1.25);
    expect(play).toHaveBeenCalledTimes(1);
    view.rerender(
      <ReferenceVideo
        url="http://localhost/reference.mp4"
        time={1.25}
        playing={false}
        onTime={onTime}
        onDuration={onDuration}
      />,
    );
    expect(pause).toHaveBeenCalledTimes(1);
    video.currentTime = 2;
    fireEvent.timeUpdate(video);
    expect(onTime).toHaveBeenCalledWith(2);
  });
  it("reports unsupported playback rather than silently showing a blank reference", () => {
    const view = render(
      <ReferenceVideo
        url="http://localhost/reference.mov"
        time={0}
        onTime={() => {}}
        onDuration={() => {}}
      />,
    );
    fireEvent.error(view.container.querySelector("video")!);
    expect(view.getByRole("alert").textContent).toContain(
      "Reference playback failed",
    );
  });
});
