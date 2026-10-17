// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSample, sampleTool, type Session } from "../../../../../shared";
import { api, post } from "../services/api";
import { Workspace } from "./Analysis";
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.useRealTimers();
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

it("restores a rejected coach prompt so retry sends one user turn", async () => {
  vi.mocked(post)
    .mockRejectedValueOnce(Error("Please retry your message."))
    .mockResolvedValueOnce({ id: "coach-job" });
  render(<Workspace analysis={{ ...makeSample(), source: "video" }} tool={sampleTool}
    session={{ id: "practice", name: "Practice", createdAt: "2026-10-17T12:00:00Z", profileId: "athlete", toolId: "tool", status: "complete", progress: 1, duration: 5, interval: 0.1, sourceKey: "private.mov" }}
    onBack={() => {}} profiles={[]} sessions={[]} />);
  const input = screen.getByRole("textbox", { name: "Question for the coach" }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "How can I improve my stance?" } });
  fireEvent.click(screen.getByRole("button", { name: "Send coach question" }));
  await screen.findByText("Please retry your message.");
  expect(input.value).toBe("How can I improve my stance?");
  fireEvent.click(screen.getByRole("button", { name: "Send coach question" }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  expect((vi.mocked(post).mock.calls[1][1] as { messages: unknown[] }).messages).toHaveLength(2);
});

it("restores a coach question when its background review fails", async () => {
  vi.mocked(post).mockResolvedValue({ id: "coach-job" });
  vi.mocked(api).mockResolvedValue({ status: "failed", error: "The AI returned an incomplete response. Please retry your message." });
  render(<Workspace analysis={{ ...makeSample(), source: "video" }} tool={sampleTool}
    session={{ id: "practice", name: "Practice", createdAt: "2026-10-17T12:00:00Z", profileId: "athlete", toolId: "tool", status: "complete", progress: 1, duration: 5, interval: 0.1, sourceKey: "private.mov" }}
    onBack={() => {}} profiles={[]} sessions={[]} />);
  const input = screen.getByRole("textbox", { name: "Question for the coach" }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "How can I improve my stance?" } });
  fireEvent.click(screen.getByRole("button", { name: "Send coach question" }));
  await screen.findByText(/The AI returned an incomplete response/);
  expect(input.value).toBe("How can I improve my stance?");
  expect(screen.queryByText("How can I improve my stance?", { selector: ".message" })).toBeNull();
  expect(screen.getByRole("button", { name: "Send coach question" }).hasAttribute("disabled")).toBe(false);
});

it("lets keyboard users widen the coach, remembers the width, and restores it after hiding", () => {
  window.localStorage.removeItem("sportsbuilder.coach.width");
  render(
    <Workspace
      analysis={makeSample()}
      tool={sampleTool}
      sample
      profiles={[]}
      sessions={[]}
      onBack={() => {}}
    />,
  );
  const divider = screen.getByRole("separator", { name: "Resize coach panel" });
  const initial = Number(divider.getAttribute("aria-valuenow"));
  fireEvent.keyDown(divider, { key: "ArrowLeft" });
  expect(Number(divider.getAttribute("aria-valuenow"))).toBe(initial + 24);
  expect(window.localStorage.getItem("sportsbuilder.coach.width")).toBe(String(initial + 24));
  fireEvent.click(screen.getByRole("button", { name: "Hide coach" }));
  expect(screen.queryByRole("separator")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show coach" }));
  expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(String(initial + 24));
  fireEvent.keyDown(screen.getByRole("separator"), { key: "End" });
  expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(screen.getByRole("separator").getAttribute("aria-valuemax"));
  fireEvent.keyDown(screen.getByRole("separator"), { key: "Home" });
  expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe("280");
  window.localStorage.removeItem("sportsbuilder.coach.width");
});

it("drags the divider left to widen coaching and clamps saved widths to laptop space", () => {
  window.localStorage.setItem("sportsbuilder.coach.width", "340");
  render(
    <Workspace
      analysis={makeSample()}
      tool={sampleTool}
      sample
      profiles={[]}
      sessions={[]}
      onBack={() => {}}
    />,
  );
  const divider = screen.getByRole("separator", { name: "Resize coach panel" });
  Object.assign(divider, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => true,
    releasePointerCapture: vi.fn(),
  });
  fireEvent(divider, new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 700 }));
  fireEvent(divider, new MouseEvent("pointermove", { bubbles: true, clientX: 600 }));
  expect(divider.getAttribute("aria-valuenow")).toBe("440");
  fireEvent(divider, new MouseEvent("pointerup", { bubbles: true }));
  fireEvent(divider, new MouseEvent("pointermove", { bubbles: true, clientX: 500 }));
  expect(divider.getAttribute("aria-valuenow")).toBe("440");
  cleanup();
  window.localStorage.setItem("sportsbuilder.coach.width", "9999");
  render(
    <Workspace
      analysis={makeSample()}
      tool={sampleTool}
      sample
      profiles={[]}
      sessions={[]}
      onBack={() => {}}
    />,
  );
  const restored = screen.getByRole("separator", { name: "Resize coach panel" });
  expect(restored.getAttribute("aria-valuenow")).toBe(restored.getAttribute("aria-valuemax"));
});

it("keeps review progress visible outside the conversation and lets the athlete stop and retry", async () => {
  vi.mocked(post).mockResolvedValue({ id: "coach-job" });
  vi.mocked(api).mockResolvedValue({ status: "running", stage: "Reviewing athlete footage frames 1–32 of 42" });
  render(<Workspace analysis={{ ...makeSample(), source: "video" }} tool={sampleTool}
    session={{ id: "practice", name: "Practice", createdAt: "2026-10-17T12:00:00Z", profileId: "athlete", toolId: "tool", status: "complete", progress: 1, duration: 5, interval: 0.1, sourceKey: "private.mov" }}
    onBack={() => {}} profiles={[]} sessions={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Review my form" }));
  const progress = await screen.findByRole("status");
  expect(progress.closest(".coach-conversation")).toBeNull();
  await waitFor(() => expect(progress.textContent).toContain("Reviewing athlete footage"));
  fireEvent.click(screen.getByRole("button", { name: "Stop review" }));
  expect(screen.queryByRole("status")).toBeNull();
  const input = screen.getByRole("textbox", { name: "Question for the coach" }) as HTMLTextAreaElement;
  expect(input.disabled).toBe(false);
  expect(input.value).toContain("Review my overall form");
  await waitFor(() => expect(post).toHaveBeenCalledWith("/agent/jobs/coach-job/cancel", {}));
});

it("restores the question if starting a review never responds and cancels a late job", async () => {
  vi.useFakeTimers();
  let finishStart!: (result: unknown) => void;
  vi.mocked(post)
    .mockReturnValueOnce(new Promise((resolve) => { finishStart = resolve; }))
    .mockResolvedValue({ status: "failed" });
  render(<Workspace analysis={{ ...makeSample(), source: "video" }} tool={sampleTool}
    session={{ id: "practice", name: "Practice", createdAt: "2026-10-17T12:00:00Z", profileId: "athlete", toolId: "tool", status: "complete", progress: 1, duration: 5, interval: 0.1, sourceKey: "private.mov" }}
    onBack={() => {}} profiles={[]} sessions={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Review my form" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(screen.getByText("The review could not start. Please retry your message.")).toBeTruthy();
  expect((screen.getByRole("textbox", { name: "Question for the coach" }) as HTMLTextAreaElement).disabled).toBe(false);
  await act(async () => { finishStart({ id: "late-job" }); });
  expect(post).toHaveBeenCalledWith("/agent/jobs/late-job/cancel", {});
  expect(screen.queryByRole("status")).toBeNull();
});
