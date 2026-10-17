// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { CoachExercises } from "./CoachExercises";
vi.mock("../services/api", () => ({ api: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const drill = {
  title: "Balance practice",
  instructions: "Move slowly in a comfortable range.",
  steps: ["☐ Hold for two seconds.", "- [ ] Return to your ready stance."],
};

it("keeps suggested exercises as readable steps without task controls or history writes", () => {
  render(<CoachExercises drill={drill} />);
  expect(screen.getByRole("heading", { name: "Exercises" })).toBeTruthy();
  expect(screen.getByText("Move slowly in a comfortable range.")).toBeTruthy();
  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "Hold for two seconds.", "Return to your ready stance.",
  ]);
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByText(/completed|check off/i)).toBeNull();
  expect(screen.queryByText(/☐/)).toBeNull();
  expect(api).not.toHaveBeenCalled();
});

it("preserves an instruction-only suggested workout without inventing tasks", () => {
  render(<CoachExercises drill={{ title: "Slow practice", instructions: "Move comfortably, then reset." }} />);
  expect(screen.getByText("Move comfortably, then reset.")).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();
  expect(api).not.toHaveBeenCalled();
});
