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
import { api, post } from "../services/api";
import { sampleTool } from "../../../../../shared";
import { Product } from "./Home";
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      clear: () => values.clear(),
    },
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  window.localStorage.clear();
});
const saved = {
  profiles: [{ id: "athlete", name: "Athlete", heightCm: 178 }],
  tools: [{ ...sampleTool, id: "tool", createdAt: "2026-10-17T12:00:00Z" }],
  sessions: [],
};

async function loadedPrompt() {
  const prompt = (await screen.findByRole("textbox", {
    name: "What are you working on?",
  })) as HTMLTextAreaElement;
  await waitFor(() => expect(prompt.disabled).toBe(false));
  return prompt;
}

describe("description-led upload", () => {
  it("asks for a sport and action instead of selecting a saved coach", async () => {
    vi.mocked(api).mockResolvedValueOnce(saved);
    render(<Product />);
    const prompt = await screen.findByRole("textbox", {
      name: "What are you working on?",
    });
    expect(
      screen.queryByRole("combobox", { name: "Coaching tool for upload" }),
    ).toBeNull();
    const upload = screen.getByRole("button", {
      name: "Upload video",
    }) as HTMLButtonElement;
    expect(upload.disabled).toBe(true);
    fireEvent.change(prompt, {
      target: { value: "Basketball jump shot; help me keep my elbow aligned." },
    });
    expect(upload.disabled).toBe(false);
  });
  it("builds from the description before uploading and reuses that coach after an upload failure", async () => {
    let finish!: (job: unknown) => void;
    const accepted = { ...saved.tools[0], id: "generated-coach" };
    vi.mocked(api).mockImplementation(async (path) => {
      if (path === "/api/home") return { ...saved, tools: [] };
      if (path === "/agent/jobs/build-job")
        return new Promise((resolve) => {
          finish = resolve;
        });
      if (path === "/api/upload") throw Error("Upload unavailable. Retry.");
      throw Error(`Unexpected API: ${path}`);
    });
    vi.mocked(post).mockResolvedValue({ id: "build-job" });
    render(<Product />);
    const prompt = await loadedPrompt();
    fireEvent.change(prompt, {
      target: { value: "  Volleyball spike; help with elbow extension.  " },
    });
    fireEvent.change(
      screen.getByRole("slider", { name: "Frame sampling rate" }),
      { target: { value: "0.5" } },
    );
    const file = new File(["video"], "spike.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByLabelText("Upload sports video"), {
      target: { files: [file] },
    });
    await screen.findByRole("button", { name: "Preparing your coach…" });
    expect(post).toHaveBeenCalledWith("/agent/build", {
      messages: [
        {
          role: "user",
          content: "Volleyball spike; help with elbow extension.",
        },
      ],
    });
    expect(
      vi.mocked(api).mock.calls.some(([path]) => path === "/api/upload"),
    ).toBe(false);
    expect(prompt.disabled).toBe(true);
    await waitFor(() => expect(typeof finish).toBe("function"));
    await act(async () => {
      finish({ status: "complete", stage: "Done", tool: accepted });
    });
    await screen.findByText("Upload unavailable. Retry.");
    const upload = vi
      .mocked(api)
      .mock.calls.find(([path]) => path === "/api/upload");
    const form = upload?.[1]?.body as FormData;
    expect(form.get("toolId")).toBe("generated-coach");
    expect(form.get("profileId")).toBe("athlete");
    expect(form.get("interval")).toBe("0.5");
    expect(form.get("file")).toBe(file);
    fireEvent.change(screen.getByLabelText("Upload sports video"), {
      target: { files: [file] },
    });
    await screen.findByText("Upload unavailable. Retry.");
    expect(post).toHaveBeenCalledTimes(1);
    expect(prompt.value).toContain("Volleyball spike");
  });
  it("keeps the description and withholds upload when coach review fails", async () => {
    vi.mocked(api).mockImplementation(async (path) => {
      if (path === "/api/home") return saved;
      if (path === "/agent/jobs/failed-build")
        return { status: "failed", error: "Coach review failed. Try again." };
      throw Error(`Unexpected API: ${path}`);
    });
    vi.mocked(post).mockResolvedValue({ id: "failed-build" });
    render(<Product />);
    const prompt = await loadedPrompt();
    fireEvent.change(prompt, {
      target: { value: "Running sprint; help my posture." },
    });
    fireEvent.change(screen.getByLabelText("Upload sports video"), {
      target: { files: [new File(["video"], "run.mp4")] },
    });
    await screen.findByText("Coach review failed. Try again.");
    expect(prompt.disabled).toBe(false);
    expect(prompt.value).toBe("Running sprint; help my posture.");
    expect(
      vi.mocked(api).mock.calls.some(([path]) => path === "/api/upload"),
    ).toBe(false);
  });
  it("starts analysis and opens the saved session after its generated coach is ready", async () => {
    const accepted = { ...saved.tools[0], id: "new-coach" };
    const session = {
      id: "new-session",
      name: "serve.mp4",
      toolId: "new-coach",
      profileId: "athlete",
      status: "processing",
      duration: 2,
      progress: 0.1,
    };
    vi.mocked(api).mockImplementation(async (path) => {
      if (path === "/api/home") return { ...saved, tools: [accepted] };
      if (path === "/agent/jobs/success-build")
        return { status: "complete", tool: accepted };
      if (path === "/api/upload" || path === "/api/sessions/new-session")
        return session;
      if (path === "/api/sessions/new-session/video")
        return { url: "/api/sessions/new-session/playback" };
      throw Error(`Unexpected API: ${path}`);
    });
    vi.mocked(post).mockImplementation(async (path) =>
      path === "/agent/build" ? { id: "success-build" } : session,
    );
    render(<Product />);
    fireEvent.change(await loadedPrompt(), {
      target: { value: "Tennis serve; help with elbow extension." },
    });
    fireEvent.change(screen.getByLabelText("Upload sports video"), {
      target: { files: [new File(["video"], "serve.mp4")] },
    });
    await screen.findByText("serve.mp4");
    expect(post).toHaveBeenCalledWith("/api/sessions/new-session/analyze", {});
    expect(
      screen.getByRole("heading", { name: "Following your movement" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Video analysis progress" }),
    ).toBeTruthy();
  });
});

describe("saved workspace loading", () => {
  it("withholds empty-workspace prerequisites until the saved records arrive", async () => {
    let finish!: (data: unknown) => void;
    vi.mocked(api).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<Product />);
    const prompt = screen.getByRole("textbox", {
      name: "What are you working on?",
    }) as HTMLTextAreaElement;
    expect(prompt.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Add an athlete" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Build your first tool" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Try a sample analysis/ }),
    ).toBeNull();
    await act(async () => {
      finish(saved);
    });
    expect(prompt.disabled).toBe(false);
    fireEvent.change(prompt, {
      target: { value: "Running strides; help with knee alignment." },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Upload video",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("offers an explicit retry after a saved-workspace failure", async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(Error("Saved workspace unavailable"))
      .mockResolvedValueOnce(saved);
    render(<Product />);
    const retry = await screen.findByRole("button", {
      name: "Retry loading workspace",
    });
    fireEvent.click(retry);
    await loadedPrompt();
    expect(
      screen.queryByRole("combobox", { name: "Athlete for upload" }),
    ).toBeNull();
    expect(api).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("keeps the upload screen focused on real videos when saved services are unavailable", async () => {
    vi.mocked(api).mockRejectedValueOnce(Error("Saved workspace unavailable"));
    render(<Product />);
    await screen.findByRole("alert");
    expect(
      screen.queryByRole("button", { name: /Try a sample analysis/ }),
    ).toBeNull();
    expect(
      screen.queryByText("Synthetic movement. No video upload needed."),
    ).toBeNull();
    expect(
      screen.queryByText("Drop your video here, or choose one to get started."),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Your first session starts here" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Build your first tool" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Before your first video" }),
    ).toBeNull();
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("requires first-use height before upload and persists the single athlete", async () => {
    const profile = { id: "default-athlete", name: "Athlete", heightCm: 178 };
    vi.mocked(api)
      .mockResolvedValueOnce({ ...saved, profiles: [] })
      .mockResolvedValueOnce({ ...saved, profiles: [profile] })
      .mockRejectedValue(Error("Upload unavailable"));
    vi.mocked(post).mockResolvedValue(profile);
    render(<Product />);
    await screen.findByText("Before your first video");
    const uploadButton = screen.getByRole("button", {
      name: "Upload video",
      hidden: true,
    }) as HTMLButtonElement;
    expect(uploadButton.disabled).toBe(true);
    const height = (await screen.findByRole("textbox", {
      name: "Height (cm)",
    })) as HTMLInputElement;
    expect(height.required).toBe(true);
    expect(height.checkValidity()).toBe(false);
    fireEvent.change(screen.getByLabelText("Upload sports video"), {
      target: { files: [new File(["video"], "blocked.mp4")] },
    });
    expect(api).toHaveBeenCalledTimes(1);
    fireEvent.change(height, { target: { value: "178" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    await screen.findByRole("heading", {
      name: "Your Athletic Dreams Will Become a Reality",
    });
    expect(post).toHaveBeenCalledWith("/api/profiles", {
      name: "Athlete",
      heightCm: 178,
    });
    expect(screen.queryByRole("button", { name: "Athletes" })).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "Athlete for upload" }),
    ).toBeNull();
    expect(screen.queryByText("Local workspace")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Upload video",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("edits height on the existing canonical profile and reuses its identity", async () => {
    const profile = { id: "canonical", name: "Athlete", heightCm: 178 };
    const updated = { ...profile, heightCm: 180 };
    vi.mocked(api)
      .mockResolvedValueOnce({
        ...saved,
        profiles: [{ id: "old-test", name: "Casey", heightCm: 175 }, profile],
      })
      .mockResolvedValueOnce(updated)
      .mockResolvedValueOnce({ ...saved, profiles: [updated] })
      .mockRejectedValue(Error("Upload unavailable"));
    render(<Product />);
    await loadedPrompt();
    fireEvent.click(screen.getByRole("button", { name: "Your profile" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Height (cm)" }), {
      target: { value: "180" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByRole("heading", {
      name: "Your Athletic Dreams Will Become a Reality",
    });
    expect(api).toHaveBeenCalledWith("/api/profiles/canonical", {
      method: "PATCH",
      body: JSON.stringify({ heightCm: 180 }),
    });
    expect(post).not.toHaveBeenCalled();
    const slider = screen.getByRole("slider", {
      name: "Frame sampling rate",
    }) as HTMLInputElement;
    expect(slider.min).toBe("0.05");
    expect(slider.max).toBe("2");
    expect(slider.step).toBe("0.05");
    expect(slider.value).toBe("0.1");
    expect(slider.getAttribute("aria-valuetext")).toBe("10 frames per second");
    fireEvent.change(slider, { target: { value: "0.15" } });
    expect(slider.getAttribute("aria-valuetext")).toBe(
      "6.67 frames per second",
    );
    expect(
      screen.queryByRole("combobox", { name: "Tracking interval" }),
    ).toBeNull();
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider.getAttribute("aria-valuetext")).toBe("0.5 frames per second");
    expect(
      (
        screen.getByRole("button", {
          name: "Upload video",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("keeps the three sections separate and preserves drafts when switching tabs", async () => {
    vi.mocked(api).mockResolvedValueOnce(saved);
    render(<Product />);
    await loadedPrompt();
    expect(screen.getByRole("heading", { name: "Recent videos" })).toBeTruthy();
    expect(screen.queryByText("Workspace")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Your tools" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Build a coaching tool" }),
    ).toBeNull();
    expect(screen.queryByText(/^\d+ sessions$/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Your profile" }));
    const height = (await screen.findByRole("textbox", {
      name: "Height (cm)",
    })) as HTMLInputElement;
    fireEvent.change(height, { target: { value: "179.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Build your coach" }));
    expect(
      screen.getByRole("heading", { name: "Build your coach" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Your profile" }));
    expect(
      (screen.getByRole("textbox", { name: "Height (cm)" }) as HTMLInputElement)
        .value,
    ).toBe("179.5");
    fireEvent.click(screen.getByRole("button", { name: "Get coached" }));
    expect(screen.getByRole("button", { name: "Upload video" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
  });
  it("uses a single arrow action for completed videos and retains failure status", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      ...saved,
      sessions: [
        {
          id: "clip",
          name: "jump.mp4",
          duration: 12,
          createdAt: "2026-10-17T12:00:00Z",
          status: "complete",
        },
        {
          id: "failed",
          name: "missing.mp4",
          duration: 3,
          createdAt: "2026-10-17T12:00:00Z",
          status: "failed",
        },
      ],
    });
    render(<Product />);
    const open = await screen.findByRole("button", { name: "Open jump.mp4" });
    expect(
      open.closest(".session-row")?.querySelectorAll("button").length,
    ).toBe(1);
    expect(screen.queryByText("Ready")).toBeNull();
    expect(screen.queryByText(/^\d+ sessions$/)).toBeNull();
    expect(screen.getByText("Failed")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open missing.mp4" }),
    ).toBeTruthy();
  });
  it("collapses to LearnUnlock’s floating hamburger and restores navigation without losing the upload draft", async () => {
    vi.mocked(api).mockResolvedValueOnce(saved);
    render(<Product />);
    await loadedPrompt();
    const slider = screen.getByRole("slider", {
      name: "Frame sampling rate",
    }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).toBeNull();
    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(expand);
    expect(screen.getByRole("button", { name: "Upload video" })).toBeTruthy();
    expect(slider.value).toBe("0.5");
    expect(window.localStorage.getItem("sportsbuilder.sidebar.collapsed")).toBe(
      "true",
    );
    fireEvent.click(expand);
    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(document.activeElement).toBe(collapse);
    expect(screen.getByRole("button", { name: "Your profile" })).toBeTruthy();
    expect(slider.value).toBe("0.5");
  });
  it("preserves the sport description when switching sections", async () => {
    vi.mocked(api).mockResolvedValueOnce(saved);
    render(<Product />);
    fireEvent.change(await loadedPrompt(), {
      target: { value: "Tennis serve; improve shoulder alignment." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Your profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Get coached" }));
    expect(
      (
        screen.getByRole("textbox", {
          name: "What are you working on?",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Tennis serve; improve shoulder alignment.");
  });
});

describe("mobile sidebar drawer", () => {
  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
  });
  it("starts hamburger-only, opens a modal drawer, and closes after navigation", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    vi.mocked(api).mockResolvedValue(saved);
    render(<Product />);
    await loadedPrompt();
    expect(screen.queryByRole("dialog")).toBeNull();
    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    fireEvent.click(expand);
    const drawer = screen.getByRole("dialog", { name: "Application sidebar" });
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector("main")?.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Your profile" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "Your profile" })).toBeTruthy();
    expect(document.querySelector("main")?.hasAttribute("inert")).toBe(false);
    expect(
      window.localStorage.getItem("sportsbuilder.sidebar.collapsed"),
    ).toBeNull();
  });
  it("closes on Escape and restores hamburger focus", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    vi.mocked(api).mockResolvedValue(saved);
    render(<Product />);
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const close = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Expand sidebar" }),
    );
  });
});
