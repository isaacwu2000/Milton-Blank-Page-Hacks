// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Analysis, type Joint, type Point } from "../../../../../shared";
import { Player } from "./Player";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const point = (overrides: Partial<Point> = {}): Point => ({
  x: 150,
  y: 150,
  vx: 30,
  vy: -40,
  ax: -100,
  ay: 200,
  confidence: 0.9,
  ...overrides,
});
const analysis = (points: Point[]): Analysis => ({
  id: "measured",
  width: 400,
  height: 300,
  duration: points.length * 0.1,
  interval: 0.1,
  ground: 200,
  source: "video",
  model: "known vector fixture",
  frames: points.map((p, i) => ({
    time: i * 0.1,
    joints: {
      right_wrist: p,
      left_wrist: point({
        x: 50,
        y: 50,
        vx: null,
        vy: null,
        ax: null,
        ay: null,
      }),
    },
  })),
});
function InteractivePlayer({ data }: { data: Analysis }) {
  const [joint, onJoint] = useState<Joint>("left_wrist");
  return (
    <Player
      analysis={data}
      time={0}
      onTime={() => {}}
      joint={joint}
      onJoint={onJoint}
      ground={200}
      calibrated
      metersPerPixel={0.01}
    />
  );
}
const endpoint = (name: string) => {
  const line = screen.getByRole("img", { name }).querySelector("line")!;
  return {
    x1: Number(line.getAttribute("x1")),
    y1: Number(line.getAttribute("y1")),
    x2: Number(line.getAttribute("x2")),
    y2: Number(line.getAttribute("y2")),
  };
};

describe("selected joint derivative vectors", () => {
  it("shows plain scalar measurements and direction arrows only after a joint click", () => {
    render(<InteractivePlayer data={analysis([point()])} />);
    expect(
      screen.queryByRole("img", { name: "Speed direction arrow" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Select Right wrist" }));
    expect(endpoint("Speed direction arrow")).toEqual({
      x1: 150,
      y1: 150,
      x2: 153,
      y2: 146,
    });
    expect(endpoint("Acceleration direction arrow")).toEqual({
      x1: 150,
      y1: 150,
      x2: 149,
      y2: 152,
    });
    expect(screen.getByLabelText("Speed").textContent).toContain("0.5");
    expect(
      screen.getByLabelText("m/s").querySelector("annotation")!.textContent,
    ).toBe(String.raw`\frac{\mathrm{m}}{\mathrm{s}}`);
    expect(screen.getByLabelText("Acceleration").textContent).toContain("2.24");
    expect(
      screen
        .getByRole("region", { name: "Right wrist details" })
        .querySelectorAll("math").length,
    ).toBe(2);
    expect(screen.queryByText(/Components:/)).toBeNull();
    const marker = screen
      .getByRole("button", { name: "Select Right wrist" })
      .querySelectorAll("circle")[1];
    expect(marker.getAttribute("fill")).toBe("none");
    expect(Number(marker.getAttribute("r"))).toBeLessThan(3);
    expect(
      screen
        .getByRole("img", { name: "Speed direction arrow" })
        .querySelector("text"),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Close joint details" }),
    );
    expect(
      screen.queryByRole("region", { name: "Right wrist details" }),
    ).toBeNull();
  });
  it("keeps each arrow scale fixed through the clip so doubling speed doubles its length", () => {
    const data = analysis([
      point({ vx: 3000, vy: -4000 }),
      point({ vx: 6000, vy: -8000 }),
    ]);
    const props = {
      analysis: data,
      onTime: () => {},
      joint: "right_wrist" as Joint,
      onJoint: () => {},
      ground: 200,
    };
    const view = render(<Player {...props} time={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Select Right wrist" }));
    expect(endpoint("Speed direction arrow")).toEqual({
      x1: 150,
      y1: 150,
      x2: 168,
      y2: 126,
    });
    view.rerender(<Player {...props} time={0.1} />);
    expect(endpoint("Speed direction arrow")).toEqual({
      x1: 150,
      y1: 150,
      x2: 186,
      y2: 102,
    });
  });
  it("keeps gaps unavailable instead of inventing arrows from a neighboring frame", () => {
    const data = analysis([
      point(),
      point({ vx: null, vy: null, ax: null, ay: null }),
      point({ confidence: 0.1 }),
    ]);
    const props = {
      analysis: data,
      onTime: () => {},
      joint: "right_wrist" as Joint,
      onJoint: () => {},
      ground: 200,
    };
    const view = render(<Player {...props} time={0.1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select Right wrist" }));
    expect(
      screen.queryByRole("img", { name: "Speed direction arrow" }),
    ).toBeNull();
    expect(
      screen.queryByRole("img", { name: "Acceleration direction arrow" }),
    ).toBeNull();
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
    view.rerender(<Player {...props} time={0.2} />);
    expect(
      screen.queryByRole("img", { name: "Speed direction arrow" }),
    ).toBeNull();
    expect(
      screen.queryByRole("img", { name: "Acceleration direction arrow" }),
    ).toBeNull();
  });
  it("fits an outward direction arrow inside the image while keeping its scalar value", () => {
    render(
      <Player
        analysis={analysis([point({ x: 380, vx: 1000, vy: 0 })])}
        time={0}
        onTime={() => {}}
        joint="right_wrist"
        onJoint={() => {}}
        ground={200}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select Right wrist" }));
    expect(endpoint("Speed direction arrow").x2).toBeLessThan(400);
    expect(screen.getByLabelText("Speed").textContent).toBe("1000 px/s");
  });
  it("keeps arrowheads within a short measured shaft even on a high-resolution clip", () => {
    const data = { ...analysis([point()]), width: 3840, height: 2160 };
    const view = render(
      <Player
        analysis={data}
        time={0}
        onTime={() => {}}
        joint="right_wrist"
        onJoint={() => {}}
        ground={200}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select Right wrist" }));
    const arrow = screen
      .getByRole("img", { name: "Speed direction arrow" })
      .querySelector("line")!;
    const markerRef = arrow.getAttribute("marker-end")!;
    const marker = view.container.querySelector(
      `[id="${markerRef.slice(5, -1)}"]`,
    )!;
    expect(marker.getAttribute("markerUnits")).toBe("userSpaceOnUse");
    expect(Number(marker.getAttribute("markerWidth"))).toBeLessThan(2);
    expect(Number(arrow.getAttribute("stroke-width"))).toBeLessThan(1);
    expect(endpoint("Speed direction arrow")).toEqual({
      x1: 150,
      y1: 150,
      x2: 153,
      y2: 146,
    });
  });
  it("typesets zero-axis labels on white chips without changing the physical image origin or adding equations to scalar measurements", () => {
    const view = render(<InteractivePlayer data={analysis([point()])} />);
    const ground = view.container.querySelector(
      '[aria-label="Ground baseline"]',
    )!;
    expect(ground.getAttribute("y1")).toBe("200");
    expect(ground.getAttribute("y2")).toBe("200");
    expect(ground.getAttribute("stroke-width")).toBe("2");
    expect(ground.getAttribute("marker-end")).toContain("-axis");
    expect(
      view.container
        .querySelector('[aria-label="Left image edge"]')!
        .getAttribute("x1"),
    ).toBe("0");
    const label = screen.getByLabelText("y equals zero");
    expect(label.querySelector("math")).toBeTruthy();
    expect((label.parentElement as HTMLElement).style.background).toBe(
      "rgb(255, 255, 255)",
    );
    expect(label.querySelector("annotation")!.textContent).toBe("y=0");
    fireEvent.click(screen.getByRole("button", { name: "Select Right wrist" }));
    expect(
      screen
        .getByRole("region", { name: "Right wrist details" })
        .querySelectorAll("math").length,
    ).toBe(2);
    expect(screen.getByLabelText("Speed").textContent).toContain("0.5");
    expect(
      screen.getByLabelText("m/s").querySelector("annotation")!.textContent,
    ).toBe(String.raw`\frac{\mathrm{m}}{\mathrm{s}}`);
  });
  it("requires real calibration before showing physical readings and renders only calibrated units as fractions", () => {
    render(
      <Player
        analysis={analysis([point()])}
        time={0}
        onTime={() => {}}
        joint="right_wrist"
        onJoint={() => {}}
        ground={200}
        requireCalibration
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select Right wrist" }));
    expect(screen.getByLabelText("Speed").textContent).toBe("Set scale");
    expect(screen.getByLabelText("Acceleration").textContent).toBe("Set scale");
    expect(
      screen.getByRole("region", { name: "Right wrist details" }).textContent,
    ).not.toContain("px");
  });
  it("pauses an already playing video and locks Play while marking one calibration frame", () => {
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockReturnValue(
      false,
    );
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      1,
    );
    const view = render(
      <Player
        analysis={analysis([point()])}
        time={0}
        onTime={() => {}}
        joint="right_wrist"
        onJoint={() => {}}
        ground={200}
        onCanvasClick={() => {}}
      />,
    );
    expect(pause).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole("button", { name: "Play video" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("slider", {
          name: "Video timeline",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(false);
    view.rerender(
      <Player
        analysis={analysis([point()])}
        time={0}
        onTime={() => {}}
        joint="right_wrist"
        onJoint={() => {}}
        ground={200}
      />,
    );
    expect(
      (screen.getByRole("button", { name: "Play video" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});

it("shows video buffering and clears it when playback is ready or fails", () => {
  const view = render(<Player analysis={analysis([point()])} url="private.mp4" time={0} onTime={() => {}} joint="right_wrist" onJoint={() => {}} ground={200} />);
  const video = view.container.querySelector("video")!;
  expect(screen.getByRole("status").textContent).toContain("Loading video");
  fireEvent.loadedData(video);
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.waiting(video);
  expect(screen.getByRole("status")).toBeTruthy();
  fireEvent.error(video);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText(/This video could not be played/)).toBeTruthy();
});
