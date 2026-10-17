// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, post } from "../services/api";
import { sampleTool } from "../../../../../shared";
import { Product } from "./Home";
vi.mock("../services/api", () => ({ api: vi.fn(), post: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const saved = {
  profiles: [{ id: "athlete", name: "Alex" }],
  tools: [{ ...sampleTool, id: "tool", createdAt: "2026-10-17T12:00:00Z" }],
  sessions: [],
};

describe("saved workspace loading", () => {
  it("withholds empty-workspace prerequisites until the saved records arrive", async () => {
    let finish!: (data: unknown) => void;
    vi.mocked(api).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<Product />);
    const tool = screen.getByRole("combobox", {
      name: "Coaching tool for upload",
    }) as HTMLButtonElement;
    expect(tool.disabled).toBe(true);
    expect(tool.textContent).toBe("Loading saved workspace…");
    expect(screen.queryByRole("button", { name: "Add an athlete" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Build your first tool" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /Try a sample analysis/ }),
    ).toBeTruthy();
    await act(async () => {
      finish(saved);
    });
    expect(tool.disabled).toBe(false);
    expect(tool.textContent).toBe(sampleTool.name);
    expect(
      (
        screen.getByRole("button", {
          name: "Choose video",
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
    await screen.findAllByText(sampleTool.name);
    expect(screen.queryByRole("combobox", { name: "Athlete for upload" })).toBeNull();
    expect(api).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /Try a sample analysis/ }),
    );
    expect(screen.getByText("Sample analysis")).toBeTruthy();
  });
  it("opens the synthetic sample when saved services are unavailable", async () => {
    vi.mocked(api).mockRejectedValueOnce(Error("Saved workspace unavailable"));
    render(<Product />);
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: /Try a sample analysis/ }),
    );
    expect(screen.getByText("Sample analysis")).toBeTruthy();
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("creates the default athlete once for uploads without exposing athlete management", async () => {
    vi.mocked(api).mockResolvedValueOnce({...saved,profiles:[]}).mockRejectedValue(Error("Upload unavailable"));
    vi.mocked(post).mockResolvedValue({id:"default-athlete",name:"Athlete"});
    render(<Product />);
    await screen.findAllByText(sampleTool.name);
    expect(screen.queryByRole("button",{name:"Athletes"})).toBeNull();
    expect(screen.queryByRole("button",{name:"View athletes"})).toBeNull();
    expect(screen.queryByText("Local workspace")).toBeNull();
    const input=screen.getByLabelText("Upload sports video");
    const file=new File(["video"],"jump.mp4",{type:"video/mp4"});
    fireEvent.change(input,{target:{files:[file]}});
    await screen.findByText("Upload unavailable");
    expect(post).toHaveBeenCalledWith("/api/profiles",{name:"Athlete"});
    const upload=vi.mocked(api).mock.calls.find(([path])=>path==="/api/upload");
    expect((upload?.[1]?.body as FormData).get("profileId")).toBe("default-athlete");
    fireEvent.change(input,{target:{files:[file]}});
    await act(async()=>{});
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("reuses the canonical athlete without assigning an old test profile to new uploads", async () => {
    vi.mocked(api).mockResolvedValueOnce({...saved,profiles:[...saved.profiles,{id:"canonical",name:"Athlete"}]}).mockRejectedValue(Error("Upload unavailable"));
    render(<Product />);
    await screen.findAllByText(sampleTool.name);
    fireEvent.change(screen.getByLabelText("Upload sports video"),{target:{files:[new File(["video"],"jump.mp4",{type:"video/mp4"})]}});
    await screen.findByText("Upload unavailable");
    expect(post).not.toHaveBeenCalled();
    const upload=vi.mocked(api).mock.calls.find(([path])=>path==="/api/upload");
    expect((upload?.[1]?.body as FormData).get("profileId")).toBe("canonical");
  });
  it("selects a coaching tool from the custom menu and dismisses outside clicks", async () => {
    vi.mocked(api).mockResolvedValueOnce({...saved,tools:[...saved.tools,{...sampleTool,id:"second-tool",name:"Jump check",createdAt:"2026-10-17T12:00:00Z"}]});
    render(<Product />);
    const tool=await screen.findByRole("combobox",{name:"Coaching tool for upload"});
    await act(async()=>{});
    fireEvent.keyDown(tool,{key:"ArrowDown"});
    fireEvent.keyDown(tool,{key:"End"});
    fireEvent.keyDown(tool,{key:"Enter"});
    expect(tool.textContent).toBe("Jump check");
    expect(document.activeElement).toBe(tool);
    fireEvent.click(tool);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
