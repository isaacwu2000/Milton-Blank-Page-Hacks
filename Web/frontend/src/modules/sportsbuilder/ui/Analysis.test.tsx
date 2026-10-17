// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeSample, sampleTool, type Session } from "../../../../../shared";
import { api, post } from "../services/api";
import { Workspace } from "./Analysis";
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("height-scale workflow", () => {
  it("saves one 178cm height scale and uses it for measured values instead of relabeling pixels", async () => {
    const analysis = { ...makeSample(), source: "video" as const };
    const session: Session = {
      id: "session",
      name: "Practice",
      createdAt: "2026-10-17T12:00:00Z",
      profileId: "alex",
      toolId: "tool",
      status: "complete",
      progress: 1,
      duration: 5,
      interval: 0.1,
      sourceKey: "private.mov",
    };
    vi.mocked(api).mockResolvedValue({});
    const view = render(
      <Workspace
        analysis={analysis}
        tool={sampleTool}
        session={session}
        onBack={() => {}}
        profiles={[{ id: "alex", name: "Alex", heightCm: 178 }]}
        sessions={[]}
      />,
    );
    expect(
      screen.getByText(
        "A clear full-body view is needed to calculate this measurement automatically.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Analysis settings" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Adjust height scale manually" }),
    );
    const overlay = view.container.querySelector("svg.pose-overlay")!;
    vi.spyOn(overlay, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 540,
      right: 800,
      bottom: 540,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.click(overlay, { clientX: 100, clientY: 50 });
    fireEvent.click(overlay, { clientX: 100, clientY: 450 });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Apply height scale" }),
      );
    });
    await waitFor(() => expect(api).toHaveBeenCalled());
    const [path, request] = vi.mocked(api).mock.calls[0];
    expect(path).toBe("/api/sessions/session");
    expect(JSON.parse(request!.body as string).calibration).toEqual({
      metersPerPixel: 0.00445,
      bodyHeightPixels: 400,
      ground: 474,
      source: "athlete_height_manual",
      heightCm: 178,
      frameTime: 0,
    });
    expect(
      screen.queryByText(
        "A clear full-body view is needed to calculate this measurement automatically.",
      ),
    ).toBeNull();
    expect(screen.getByText("0.60")).toBeTruthy();
    expect(screen.getAllByLabelText("m/s").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Set ground line" }));
    await act(async () => {
      fireEvent.click(overlay, { clientX: 100, clientY: 400 });
    });
    const groundUpdate = JSON.parse(
      vi.mocked(api).mock.calls[1][1]!.body as string,
    );
    expect(groundUpdate.calibration).toEqual({
      metersPerPixel: 0.00445,
      bodyHeightPixels: 400,
      ground: 400,
      source: "athlete_height_manual",
      heightCm: 178,
      frameTime: 0,
    });
  });
  it("lets the labeled sample use the canonical athlete height without changing session ownership", () => {
    render(
      <Workspace
        analysis={makeSample()}
        tool={sampleTool}
        sample
        onBack={() => {}}
        profiles={[
          { id: "unrelated", name: "Old profile", heightCm: 175 },
          { id: "athlete", name: "Athlete", heightCm: 178 },
        ]}
        sessions={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Analysis settings" }));
    const start = screen.getByRole("button", {
      name: "Adjust height scale manually",
    }) as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    fireEvent.click(start);
    expect(screen.getByText("Using your 178 cm height")).toBeTruthy();
    expect(
      screen.getByText("Synthetic movement · explore how the analysis works"),
    ).toBeTruthy();
  });
  it("discards a first height mark when seeking so the two marks cannot span different frames", () => {
    const view = render(
      <Workspace
        analysis={makeSample()}
        tool={sampleTool}
        sample
        onBack={() => {}}
        profiles={[
          { id: "unrelated", name: "Old profile", heightCm: 175 },
          { id: "athlete", name: "Athlete", heightCm: 178 },
        ]}
        sessions={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Analysis settings" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Adjust height scale manually" }),
    );
    const overlay = view.container.querySelector("svg.pose-overlay")!;
    vi.spyOn(overlay, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 540,
      right: 800,
      bottom: 540,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.click(overlay, { clientX: 100, clientY: 50 });
    expect(screen.getByText(/shoes \(1\/2\)/)).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: "Video timeline" }), {
      target: { value: "1" },
    });
    expect(screen.getByText(/shoes \(0\/2\)/)).toBeTruthy();
    fireEvent.click(overlay, { clientX: 100, clientY: 450 });
    expect(
      (
        screen.getByRole("button", {
          name: "Apply height scale",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

describe("single-video coaching", () => {
  it("keeps reference evidence for the coach without loading or showing comparison controls", async () => {
    vi.mocked(post).mockResolvedValue({ id: "coach-job" });
    render(
      <Workspace
        analysis={{ ...makeSample(), source: "video" as const }}
        tool={{ ...sampleTool, referenceId: "reference-video" }}
        session={{
          id: "practice",
          name: "Practice",
          createdAt: "2026-10-17T12:00:00Z",
          profileId: "athlete",
          toolId: "tool",
          status: "complete",
          progress: 1,
          duration: 5,
          interval: 0.1,
          sourceKey: "private.mov",
        }}
        onBack={() => {}}
        profiles={[{ id: "athlete", name: "Athlete", heightCm: 178 }]}
        sessions={[]}
      />,
    );
    expect(
      screen.queryByRole("combobox", {
        name: "Compare with a reference video",
      }),
    ).toBeNull();
    expect(screen.queryByText("Pair these starting frames")).toBeNull();
    expect(screen.queryByText("Link playback")).toBeNull();
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review my form" }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/agent/coach",
        expect.objectContaining({
          sessionId: "practice",
          referenceId: "reference-video",
        }),
      ),
    );
  });
});

it("uses the automatically saved height scale immediately without manual setup", () => {
  const session: Session = {
    id: "automatic",
    name: "Full body",
    createdAt: "2026-10-17T12:00:00Z",
    profileId: "athlete",
    toolId: "tool",
    status: "complete",
    progress: 1,
    duration: 5,
    interval: 0.1,
    sourceKey: "private.mov",
    calibration: {
      metersPerPixel: 0.00445,
      ground: 474,
      source: "athlete_height_auto",
      heightCm: 178,
      bodyHeightPixels: 400,
      frameTime: 0,
    },
  };
  render(
    <Workspace
      analysis={makeSample()}
      tool={sampleTool}
      session={session}
      profiles={[{ id: "athlete", name: "Athlete", heightCm: 178 }]}
      sessions={[]}
      onBack={() => {}}
    />,
  );
  expect(screen.queryByText(/couldn’t estimate a reliable scale/)).toBeNull();
  expect(screen.getAllByLabelText("m/s").length).toBeGreaterThan(0);
  expect(vi.mocked(api)).not.toHaveBeenCalled();
});

describe("motion measurement recovery", () => {
  it("explains missing scale beside the readings and opens manual scale setup", () => {
    render(
      <Workspace
        analysis={makeSample()}
        tool={sampleTool}
        sample
        onBack={() => {}}
        profiles={[{ id: "athlete", name: "Athlete", heightCm: 178 }]}
        sessions={[]}
      />,
    );
    expect(screen.getAllByText("Set scale").length).toBe(3);
    fireEvent.click(
      screen.getByRole("button", { name: "Set measurement scale" }),
    );
    expect(screen.getByText("Using your 178 cm height")).toBeTruthy();
  });
  it("explains absent derivatives and seeks to a frame with measured acceleration", () => {
    const analysis = makeSample();
    const joint = sampleTool.focusJoint;
    for (const frame of analysis.frames.slice(0, 2)) {
      frame.joints[joint] = {
        ...frame.joints[joint]!,
        vx: null,
        vy: null,
        ax: null,
        ay: null,
      };
    }
    render(
      <Workspace
        analysis={analysis}
        tool={sampleTool}
        onBack={() => {}}
        session={{
          id: "s",
          profileId: "athlete",
          toolId: "tool",
          sourceKey: "clip.mov",
          name: "clip",
          status: "complete",
          progress: 1,
          interval: 0.1,
          duration: analysis.duration,
          createdAt: "2026-10-17",
          calibration: { metersPerPixel: 0.01, ground: analysis.ground },
        }}
        profiles={[]}
        sessions={[]}
      />,
    );
    expect(screen.getAllByText("Need nearby frames").length).toBe(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Go to measured frame" }),
    );
    expect(screen.queryByText("Need nearby frames")).toBeNull();
    expect(
      (
        screen.getByRole("slider", {
          name: "Video timeline",
        }) as HTMLInputElement
      ).value,
    ).toBe(String(analysis.frames[2].time));
  });
});
