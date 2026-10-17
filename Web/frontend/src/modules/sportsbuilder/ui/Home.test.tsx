// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
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
    const athlete = screen.getByRole("combobox", {
      name: "Athlete for upload",
    }) as HTMLButtonElement;
    expect(athlete.disabled).toBe(true);
    expect(athlete.textContent).toBe("Loading saved workspace…");
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
    expect(athlete.disabled).toBe(false);
    expect(athlete.textContent).toBe("Alex");
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
    await screen.findByRole("combobox", { name: "Athlete for upload" });
    expect(screen.getByRole("combobox", { name: "Athlete for upload" }).textContent).toBe("Alex");
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
  it("selects an athlete with LearnUnlock's custom keyboard listbox and closes on Escape", async () => {
    vi.mocked(api).mockResolvedValueOnce({...saved, profiles:[...saved.profiles,{id:"other-athlete",name:"Jordan"}]});
    render(<Product />);
    const athlete=await screen.findByRole("combobox", {name:"Athlete for upload"});
    await act(async()=>{});
    fireEvent.keyDown(athlete,{key:"ArrowDown"});
    expect(screen.getByRole("listbox",{name:"Athlete for upload"})).toBeTruthy();
    fireEvent.keyDown(athlete,{key:"End"});
    fireEvent.keyDown(athlete,{key:"Enter"});
    expect(athlete.textContent).toBe("Jordan");
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(athlete);
    fireEvent.keyDown(athlete,{key:"Escape"});
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(athlete.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(athlete);
    const alex=screen.getByRole("option",{name:"Alex"});
    fireEvent.pointerDown(alex);
    fireEvent.click(alex);
    fireEvent.click(screen.getByRole("combobox",{name:"Coaching tool for upload"}));
    expect(athlete.textContent).toBe("Alex");
  });
  it("selects a coaching tool from the custom menu and dismisses outside clicks", async () => {
    vi.mocked(api).mockResolvedValueOnce({...saved,tools:[...saved.tools,{...sampleTool,id:"second-tool",name:"Jump check",createdAt:"2026-10-17T12:00:00Z"}]});
    render(<Product />);
    const tool=await screen.findByRole("combobox",{name:"Coaching tool for upload"});
    await act(async()=>{});
    fireEvent.click(tool);
    fireEvent.click(screen.getByRole("option",{name:"Jump check"}));
    expect(tool.textContent).toBe("Jump check");
    expect(document.activeElement).toBe(tool);
    fireEvent.click(tool);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
