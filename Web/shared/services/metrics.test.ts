import { describe, expect, it } from "vitest";
import {
  calculate,
  jointMeasurement,
  sampleTool,
  validateTool,
  type Analysis,
  type Expr,
  type Point,
  type SavedTool,
  type ToolConfig,
} from "../index";

const point = (x: number, y: number): Point => ({
  x,
  y,
  vx: 3,
  vy: 4,
  ax: 0,
  ay: 2,
  confidence: 0.9,
});
const fixture = (): Analysis => ({
  id: "known-motion",
  source: "video",
  model: "known numerical fixture",
  width: 100,
  height: 100,
  ground: 20,
  duration: 0.2,
  interval: 0.1,
  frames: [
    {
      time: 0,
      joints: {
        right_shoulder: point(0, 10),
        right_elbow: point(10, 10),
        right_wrist: point(20, 10),
      },
    },
    {
      time: 0.1,
      joints: {
        right_shoulder: point(0, 10),
        right_elbow: point(10, 10),
        right_wrist: point(10, 0),
      },
    },
    {
      time: 0.2,
      joints: {
        right_shoulder: point(10, 10),
        right_elbow: point(10, 10),
        right_wrist: point(10, 0),
      },
    },
  ],
});
const tool = (metrics: ToolConfig["metrics"]): ToolConfig => ({
  ...sampleTool,
  metrics,
});
const metric = (
  id: string,
  formula: Expr,
  unit: ToolConfig["metrics"][number]["unit"],
  scope: "frame" | "summary" = "frame",
): ToolConfig["metrics"][number] => ({
  id,
  name: id,
  description: "Known-value verification",
  formula,
  unit,
  scope,
});
const reference = (metric: string): Expr => ({ op: "metric", metric });

describe("trusted metric calculations", () => {
  it("distinguishes straight, bent, and overlapping limb points", () => {
    const { frames, summaries } = calculate(sampleTool, fixture());
    expect(frames.elbow_angle[0]).toBeCloseTo(180);
    expect(frames.elbow_angle[1]).toBeCloseTo(90);
    expect(frames.elbow_angle[2]).toBeNull();
    expect(summaries.peak_wrist_speed).toBe(5);
  });
  it("converts physical units and upward coordinates consistently for inspector and formulas", () => {
    const body = fixture();
    const measured = tool([
      metric("height", { op: "y", joint: "right_wrist" }, "length"),
      metric("upward_velocity", { op: "vy", joint: "right_wrist" }, "speed"),
      metric(
        "acceleration",
        { op: "acceleration", joint: "right_wrist" },
        "acceleration",
      ),
      metric("speed", { op: "speed", joint: "right_wrist" }, "speed"),
    ]);
    const result = calculate(measured, body, 0.01, 20);
    expect(result.frames.height[0]).toBeCloseTo(0.1);
    expect(result.frames.upward_velocity[0]).toBeCloseTo(-0.04);
    expect(result.frames.acceleration[0]).toBeCloseTo(0.02);
    expect(result.frames.speed[0]).toBeCloseTo(0.05);
    expect(
      jointMeasurement(body.frames[0].joints.right_wrist, "y", 0.01, 20),
    ).toBe(result.frames.height[0]);
  });
  it("composes a summary from maximum height and the exact initial baseline", () => {
    const configured = tool([
      metric("height", { op: "y", joint: "right_wrist" }, "length"),
      metric(
        "rise",
        {
          op: "subtract",
          args: [
            { op: "max", args: [reference("height")] },
            { op: "initial", args: [reference("height")] },
          ],
        },
        "length",
        "summary",
      ),
      metric(
        "ending",
        { op: "final", args: [reference("height")] },
        "length",
        "summary",
      ),
    ]);
    const body = fixture();
    expect(calculate(configured, body).summaries).toEqual({
      rise: 10,
      ending: 20,
    });
    body.frames[0].joints.right_wrist!.confidence = 0.1;
    body.frames[2].joints.right_wrist!.confidence = 0.1;
    expect(calculate(configured, body).summaries).toEqual({
      rise: null,
      ending: null,
    });
  });
  it("keeps missing measurements unavailable without clamping raw model scores to a probability", () => {
    const body = fixture();
    body.frames[0].joints.right_wrist!.confidence = 2.4;
    body.frames[1].joints.right_wrist!.vx = NaN;
    delete body.frames[2].joints.right_wrist;
    expect(calculate(sampleTool, body).frames.wrist_speed).toEqual([
      5,
      null,
      null,
    ]);
    expect(jointMeasurement(undefined, "point")).toBeNull();
    expect(jointMeasurement({ ...point(1, 2), x: Infinity }, "x")).toBeNull();
    expect(jointMeasurement({ ...point(1, 2), vx: NaN }, "speed")).toBeNull();
    expect(jointMeasurement(point(1e308, 2), "point", 1e308)).toBeNull();
  });
  it("loads exact saved-tool metadata while rejecting unknown configuration fields", () => {
    const saved: SavedTool = {
      ...sampleTool,
      id: "4ab20613-ef81-4ed9-a14b-3df983cf228c",
      createdAt: "2026-10-17T12:00:00.000Z",
    };
    expect(calculate(saved, fixture())).toEqual(
      calculate(sampleTool, fixture()),
    );
    expect(() =>
      validateTool({ ...saved, executable: "process.exit()" }),
    ).toThrow();
  });
  it.each([
    { op: "add", args: [{ op: "y", joint: "right_wrist" }, 1] },
    { op: "metric", metric: "later" },
    { op: "metric", metric: "invalid" },
    { op: "eval", args: [1, 2] },
    { op: "angle", args: [1, 2, 3] },
  ])("rejects invalid units, dependencies, or operations: $op", (formula) => {
    expect(() =>
      validateTool(tool([metric("invalid", formula as Expr, "number")])),
    ).toThrow();
  });
  it("rejects extreme raw nesting before a recursive schema can overflow", () => {
    let expression: Expr = 1;
    for (let i = 0; i < 20000; i++)
      expression = { op: "abs", args: [expression] };
    expect(() =>
      validateTool(tool([metric("nested", expression, "number")])),
    ).toThrow("too complex");
  });
  it("returns unavailable for invalid arithmetic and entirely missing aggregates", () => {
    const configured = tool([
      metric("division", { op: "divide", args: [1, 0] }, "number"),
      metric("root", { op: "sqrt", args: [-1] }, "number"),
      metric(
        "peak",
        { op: "max", args: [reference("division")] },
        "number",
        "summary",
      ),
    ]);
    const result = calculate(configured, fixture());
    expect(result.frames.division).toEqual([null, null, null]);
    expect(result.frames.root).toEqual([null, null, null]);
    expect(result.summaries.peak).toBeNull();
  });
});
