import { describe, expect, it } from "vitest";
import coaches from "../../backend/server/premade_coaches.json";
import { savedToolSchema } from "../types";
import { calculate, validateTool } from "./metrics";

describe("shipped coaches", () => {
  for (const coach of coaches) {
    it(`${coach.name} is a usable saved configuration without invented measurements`, () => {
      const saved = savedToolSchema.parse(coach);
      const tool = validateTool(saved);
      const result = calculate(tool, {
        id: "empty-video", width: 640, height: 480, duration: 1,
        interval: 0.1, ground: 480, frames: [{ time: 0, joints: {} }],
        source: "video", model: "test",
      });
      for (const values of Object.values(result.frames)) {
        expect(values).toEqual([null]);
      }
      expect(saved.referenceId).toBeUndefined();
    });
  }
});

it("retains hidden saved coach compatibility without passing metadata to measurements", () => {
  const saved = savedToolSchema.parse({ ...coaches[0], hidden: true });
  expect(saved.hidden).toBe(true);
  expect(validateTool(saved)).not.toHaveProperty("hidden");
});
