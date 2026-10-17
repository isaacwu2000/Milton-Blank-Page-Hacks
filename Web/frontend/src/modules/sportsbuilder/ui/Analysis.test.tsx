// @vitest-environment jsdom
import {
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

it("keeps automatic measurements and video actions without manual calibration or redundant labels", () => {
  render(
    <Workspace analysis={makeSample()} tool={sampleTool} sample
      profiles={[{ id: "athlete", name: "Athlete", heightCm: 178 }]}
      sessions={[]} onBack={() => {}} />,
  );
  expect(screen.queryByRole("button", { name: "Set measurement scale" })).toBeNull();
  expect(screen.queryByText(/Gaps indicate missing points/)).toBeNull();
  expect(screen.queryByText("Video analysis")).toBeNull();
  expect(screen.getByText("Synthetic movement · explore how the analysis works")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Video options" }));
  expect(screen.getByRole("button", { name: "Download tool" })).toBeTruthy();
  expect(screen.queryByText("Measurement settings")).toBeNull();
  expect(screen.queryByRole("button", { name: "Set ground line" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Calibrate distance" })).toBeNull();
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
