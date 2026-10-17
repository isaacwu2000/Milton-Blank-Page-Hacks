// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { CoachExercises } from "./CoachExercises";
vi.mock("../services/api", () => ({ api: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const drill = {
  title: "Balance practice",
  instructions: "Move slowly in a comfortable range.",
  steps: ["Hold for two seconds.", "Return to your ready stance."],
};
it("saves individual practice goals, restores checks and preserves unrelated completions", async () => {
  vi.mocked(api).mockResolvedValue({});
  const session = { id: "practice", completedDrills: ["Earlier drill"] };
  render(<CoachExercises drill={drill} session={session} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Hold for two seconds." }));
  await waitFor(() => expect(api).toHaveBeenCalledWith("/api/sessions/practice", {
    method: "PATCH",
    body: JSON.stringify({ completedDrills: ["Earlier drill", 'goal:["Balance practice","Hold for two seconds."]'] }),
  }));
  await screen.findByText("1 of 2 practice goals completed");
  expect((screen.getByRole("checkbox", { name: "Return to your ready stance." }) as HTMLInputElement).checked).toBe(false);
  cleanup();
  render(<CoachExercises drill={drill} session={{ ...session, completedDrills: ['goal:["Balance practice","Hold for two seconds."]'] }} />);
  expect((screen.getByRole("checkbox", { name: "Hold for two seconds." }) as HTMLInputElement).checked).toBe(true);
});
it("leaves a goal unchecked when saving fails and permits retry", async () => {
  vi.mocked(api).mockRejectedValueOnce(Error("Could not save practice"));
  render(<CoachExercises drill={drill} session={{ id: "practice", completedDrills: [] }} />);
  const checkbox = screen.getByRole("checkbox", { name: "Hold for two seconds." }) as HTMLInputElement;
  fireEvent.click(checkbox);
  await screen.findByText("Could not save practice");
  expect(checkbox.checked).toBe(false);
  expect(checkbox.disabled).toBe(false);
});
it("converts a completed whole drill to individual goals when one goal is undone", async () => {
  vi.mocked(api).mockResolvedValue({});
  render(<CoachExercises drill={drill} session={{ id: "practice", completedDrills: ["Balance practice", "Earlier drill"] }} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Hold for two seconds." }));
  await screen.findByText("1 of 2 practice goals completed");
  expect(api).toHaveBeenCalledWith("/api/sessions/practice", {
    method: "PATCH",
    body: JSON.stringify({ completedDrills: ["Earlier drill", 'goal:["Balance practice","Return to your ready stance."]'] }),
  });
});
