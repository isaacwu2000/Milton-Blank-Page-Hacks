import { describe, it, expect } from "vitest";
import { scaleFromAthleteHeight } from "./calibration";
describe("athlete-height calibration", () => {
  it("uses 178 cm and the vertical head-to-sole span to calculate meters", () => {
    const converted = scaleFromAthleteHeight(
      178,
      [500, 100],
      [510, 1100],
      1920,
      1200,
    );
    expect(converted.metersPerPixel).toBeCloseTo(0.00178, 12);
    expect(converted.bodyHeightPixels).toBe(1000);
  });
  it.each([
    [
      [50, 50],
      [50, 50],
    ],
    [
      [50, 60],
      [50, 65],
    ],
    [
      [50, 100],
      [50, 50],
    ],
    [
      [-1, 0],
      [50, 100],
    ],
    [
      [0, 0],
      [500, 100],
    ],
  ])(
    "rejects coincident, small, reversed or out-of-image references",
    (head, sole) => {
      expect(() =>
        scaleFromAthleteHeight(
          178,
          head as [number, number],
          sole as [number, number],
          400,
          300,
        ),
      ).toThrow();
    },
  );
});
