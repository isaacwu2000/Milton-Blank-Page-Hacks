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
import { SessionWorkspace, Workspace } from "./Analysis";
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

describe("height-scale workflow", () => {
  it.each([
    { storedScale: 0.005, confirmed: true },
    { storedScale: 0.01, confirmed: false },
  ])(
    "only accepts a matching saved scale after a lost response ($confirmed)",
    async ({ storedScale, confirmed }) => {
      const analysis = makeSample();
      const calibration = {
        metersPerPixel: storedScale,
        ground: analysis.ground,
        source: "known_distance",
      };
      vi.mocked(api)
        .mockRejectedValueOnce(
          new DOMException("The operation timed out.", "TimeoutError"),
        )
        .mockResolvedValueOnce({ calibration });
      const view = render(
        <Workspace
          analysis={analysis}
          tool={sampleTool}
          session={{
            id: "scale-save",
            name: "clip",
            profileId: "athlete",
            toolId: "tool",
            status: "complete",
            progress: 1,
            duration: analysis.duration,
            interval: 0.1,
            sourceKey: "clip.mov",
            createdAt: "2026-10-17",
          }}
          profiles={[{ id: "athlete", name: "Athlete", heightCm: 178 }]}
          sessions={[]}
          onBack={() => {}}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Analysis settings" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Calibrate distance" }),
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
      fireEvent.click(overlay, { clientX: 100, clientY: 100 });
      fireEvent.click(overlay, { clientX: 300, clientY: 100 });
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
      if (!confirmed) {
        expect((await screen.findByRole("alert")).textContent).toContain(
          "could not be confirmed",
        );
        expect(
          screen.queryByText(
            "Distance calibration saved. Measurements are approximate 2D projections.",
          ),
        ).toBeNull();
        return;
      }
      await screen.findByText(
        "Distance calibration saved. Measurements are approximate 2D projections.",
      );
      expect(api).toHaveBeenCalledTimes(2);
      expect(vi.mocked(api).mock.calls[1][0]).toBe("/api/sessions/scale-save");
      expect(vi.mocked(api).mock.calls[1][1]?.method).toBeUndefined();
      expect(screen.queryByText("Set scale for measurements")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getAllByLabelText("m/s").length).toBeGreaterThan(0);
    },
  );

  it("shows a pending distance save and keeps the marks available after failure", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(api).mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const analysis = makeSample();
    const view = render(
      <Workspace
        analysis={analysis}
        tool={sampleTool}
        session={{
          id: "scale-save",
          name: "clip",
          profileId: "athlete",
          toolId: "tool",
          status: "complete",
          progress: 1,
          duration: analysis.duration,
          interval: 0.1,
          sourceKey: "clip.mov",
          createdAt: "2026-10-17",
        }}
        profiles={[{ id: "athlete", name: "Athlete", heightCm: 178 }]}
        sessions={[]}
        onBack={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Analysis settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Calibrate distance" }));
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
    fireEvent.click(overlay, { clientX: 100, clientY: 100 });
    fireEvent.click(overlay, { clientX: 300, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Saving scale…",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText("Saving measurement scale…")).toBeTruthy();
    const timeline = screen.getByRole("slider", {
      name: "Video timeline",
    }) as HTMLInputElement;
    fireEvent.change(timeline, { target: { value: "1" } });
    expect(timeline.value).toBe("0");
    await act(async () => {
      reject(Error("Database unavailable. Try again."));
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Database unavailable",
    );
    expect(
      (screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      screen.getByText("Click two ends of a known distance (2/2)."),
    ).toBeTruthy();
  });


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
    expect(screen.queryByRole("button", { name: "Apply height scale" })).toBeNull();
    await act(async () => {
      fireEvent.click(overlay, { clientX: 100, clientY: 450 });
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
    expect(screen.getByText(/shoes \(1\/2\)/)).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
    expect(screen.queryByText("Height scale saved. Measurements now use meters.")).toBeNull();
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

it("separates evidence-grounded feedback from a practice checklist without inventing strengths", async () => {
  vi.mocked(post).mockResolvedValue({ id: "coach-job" });
  vi.mocked(api).mockResolvedValue({
    status: "complete", reply: "Focus on your reset.",
    feedback: { doingWell: [], improve: ["At 1.2 seconds, return to a balanced stance before repeating."], limitations: ["The feet leave the frame, so foot placement is uncertain."] },
    drill: { title: "Reset practice", instructions: "Move comfortably.", steps: ["Pause for two seconds.", "Reset before the next repetition."] },
  });
  render(<Workspace analysis={{ ...makeSample(), source: "video" }} tool={sampleTool}
    session={{ id: "practice", name: "Practice", createdAt: "2026-10-17T12:00:00Z", profileId: "athlete", toolId: "tool", status: "complete", progress: 1, duration: 5, interval: 0.1, sourceKey: "private.mov" }}
    onBack={() => {}} profiles={[]} sessions={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Review my form" }));
  await screen.findByRole("heading", { name: "What’s going well" });
  expect(screen.getByText("There is not enough evidence to identify a clear strength yet.")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "What to improve" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Evidence limits" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Exercises" })).toBeTruthy();
  expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Mark complete" })).toBeNull();
});

it("reveals the newest coach response inside its conversation", async () => {
  vi.mocked(post).mockResolvedValue({ id: "coach-job" });
  vi.mocked(api).mockResolvedValue({ status: "complete", reply: "At 1.2 seconds, your knee bends." });
  const view = render(<Workspace analysis={{ ...makeSample(), source: "video" }} tool={sampleTool}
    session={{ id: "practice", name: "Practice", createdAt: "2026-10-17T12:00:00Z", profileId: "athlete", toolId: "tool", status: "complete", progress: 1, duration: 5, interval: 0.1, sourceKey: "private.mov" }}
    onBack={() => {}} profiles={[]} sessions={[]} />);
  const conversation = view.container.querySelector(".coach-conversation") as HTMLDivElement;
  Object.defineProperty(conversation, "scrollHeight", { value: 1000 });
  fireEvent.click(screen.getByRole("button", { name: "Review my form" }));
  await screen.findByText("At 1.2 seconds, your knee bends.");
  expect(conversation.scrollTop).toBe(1000);
});


it("shows recalculation failures inside the still-open analysis workspace", async () => {
  const analysis = makeSample();
  let rejectStart!: (error: Error) => void;
  const session = {
    id: "recalculate",
    name: "clip",
    profileId: "athlete",
    toolId: "00000000-0000-4000-8000-000000000010",
    status: "complete",
    progress: 1,
    duration: analysis.duration,
    interval: 0.1,
    sourceKey: "clip.mov",
    createdAt: "2026-10-17",
  };
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.endsWith("/analyze"))
      return new Promise((_, reject) => {
        rejectStart = reject;
      });
    if (path.endsWith("/analysis")) return analysis;
    if (path.endsWith("/video")) return { url: "" };
    return session;
  });
  render(
    <SessionWorkspace
      sessionId="recalculate"
      data={{
        profiles: [{ id: "athlete", name: "Athlete", heightCm: 178 }],
        tools: [
          {
            ...sampleTool,
            id: "00000000-0000-4000-8000-000000000010",
            createdAt: "2026-10-17T12:00:00Z",
          },
        ],
        sessions: [],
      }}
      onBack={() => {}}
    />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Recalculate automatically" }),
  );
  await screen.findByRole("button", { name: "Starting recalculation…" });
  expect(
    (
      screen.getByRole("button", {
        name: "Set measurement scale",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Analysis settings" }));
  expect(
    (
      screen.getByRole("button", {
        name: "Calibrate distance",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Adjust height scale manually",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await act(async () => {
    rejectStart(Error("Recalculation could not start. Try again."));
  });
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Recalculation could not start",
  );
});
