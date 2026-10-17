import assert from "node:assert/strict";
import {
  sampleTool,
  calculate,
  metricTarget,
  validateTool,
  makeSample,
  jointMeasurement,
  type Analysis,
  type Expr,
  type ToolConfig,
  type SavedTool,
} from "../Web/shared";
const p = (x: number, y: number, confidence = 1) => ({
  x,
  y,
  confidence,
  vx: 3,
  vy: 4,
  ax: 0,
  ay: 2,
});
const analysis: Analysis = {
  id: "known",
  width: 100,
  height: 100,
  ground: 20,
  duration: 0.2,
  interval: 0.1,
  source: "video",
  model: "verification fixture",
  frames: [
    {
      time: 0,
      joints: {
        right_shoulder: p(0, 10),
        right_elbow: p(10, 10),
        right_wrist: p(20, 10),
        left_hip: p(5, 12),
        right_hip: p(15, 12),
      },
    },
    {
      time: 0.1,
      joints: {
        right_shoulder: p(0, 10),
        right_elbow: p(10, 10),
        right_wrist: p(10, 0),
        left_hip: p(5, 7),
        right_hip: p(15, 7),
      },
    },
    {
      time: 0.2,
      joints: {
        right_shoulder: p(10, 10),
        right_elbow: p(10, 10),
        right_wrist: p(10, 0),
        left_hip: p(5, 4),
        right_hip: p(15, 4),
      },
    },
  ],
};
const metric = (
  id: string,
  formula: Expr,
  unit: ToolConfig["metrics"][number]["unit"] = "number",
  scope: "frame" | "summary" = "frame",
) => ({ id, name: id, description: id, formula, unit, scope });
const tool = (metrics: ToolConfig["metrics"]) => ({ ...sampleTool, metrics });
const joint = (
  joint:
    "right_shoulder" | "right_elbow" | "right_wrist" | "left_hip" | "right_hip",
): Expr => ({ op: "point", joint });
const ref = (metric: string): Expr => ({ op: "metric", metric });
const near = (actual: number | null | undefined, expected: number) =>
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) < 1e-8,
    `${actual} should equal ${expected}`,
  );
validateTool(sampleTool);
const sample = calculate(sampleTool, makeSample());
assert.equal(sample.frames.elbow_angle.length, 51);
const known = calculate(sampleTool, analysis);
near(known.frames.elbow_angle[0], 180);
near(known.frames.elbow_angle[1], 90);
assert.equal(known.frames.elbow_angle[2], null);
near(known.summaries.peak_wrist_speed, 5);
const custom = tool([
  metric(
    "distance",
    { op: "distance", args: [joint("right_shoulder"), joint("right_wrist")] },
    "length",
  ),
  metric(
    "height",
    {
      op: "y",
      args: [{ op: "midpoint", args: [joint("left_hip"), joint("right_hip")] }],
    },
    "length",
  ),
  metric("vy", { op: "vy", joint: "right_wrist" }, "speed"),
  metric("ay", { op: "ay", joint: "right_wrist" }, "acceleration"),
  metric(
    "jump",
    {
      op: "subtract",
      args: [
        { op: "max", args: [ref("height")] },
        { op: "initial", args: [ref("height")] },
      ],
    },
    "length",
    "summary",
  ),
  metric("average", { op: "mean", args: [ref("height")] }, "length", "summary"),
  metric(
    "jump_ratio",
    { op: "divide", args: [ref("jump"), ref("average")] },
    "number",
    "summary",
  ),
  metric("zero_division", { op: "divide", args: [1, 0] }),
  metric("negative_root", { op: "sqrt", args: [-1] }),
  metric(
    "custom",
    {
      op: "multiply",
      args: [{ op: "speed", joint: "right_wrist" }, { op: "time" }],
    },
    "length",
  ),
]);
const result = calculate(custom, analysis, 0.01);
near(result.frames.distance[0], 0.2);
near(result.frames.height[0], 0.08);
near(result.frames.height[1], 0.13);
near(result.frames.vy[0], -0.04);
near(result.frames.ay[0], -0.02);
near(result.summaries.jump, 0.08);
near(result.summaries.average, 0.37 / 3);
near(result.frames.custom[1], 0.005);
assert.equal(result.frames.zero_division[0], null);
assert.equal(result.frames.negative_root[0], null);
for (const formula of [
  { op: "add", args: [{ op: "x", joint: "right_wrist" }, 1] },
  { op: "eval", args: [1, 2] },
  { op: "speed", joint: "right_wrist", value: 5 },
  { op: "metric", metric: "later" },
  { op: "constant", args: [1] },
  { op: "distance", args: [1, 2] },
])
  assert.throws(() => validateTool(tool([metric("invalid", formula as Expr)])));
assert.throws(() =>
  validateTool(
    tool([metric("time_summary", { op: "time" }, "time", "summary")]),
  ),
);
assert.throws(() =>
  validateTool(
    tool([
      metric("height", { op: "y", joint: "right_wrist" }, "length"),
      metric("illegal_summary", ref("height"), "length", "summary"),
    ]),
  ),
);
assert.throws(() => validateTool(tool([metric("cycle", ref("cycle"))])));
assert.throws(() => calculate(custom, analysis, 0));
const unavailable = structuredClone(analysis);
unavailable.frames[0].joints.right_wrist!.confidence = 0.1;
unavailable.frames[1].joints.right_wrist!.vx = NaN;
const missing = calculate(sampleTool, unavailable);
assert.equal(missing.frames.elbow_angle[0], null);
assert.equal(missing.frames.wrist_speed[1], null);
const noFrames = calculate(custom, { ...analysis, frames: [] });
assert.equal(noFrames.summaries.jump, null);
const threshold = {
  ...custom.metrics[0],
  target: { min: 1, max: 2, message: "target" },
};
assert.equal(metricTarget(threshold, false), undefined);
assert.equal(metricTarget(threshold, true)?.min, 1);
// Saved records must calculate exactly like the reviewed configuration.
const saved: SavedTool = {
  ...sampleTool,
  id: "4ab20613-ef81-4ed9-a14b-3df983cf228c",
  createdAt: "2026-10-17T12:00:00.123456+00:00",
};
assert.deepEqual(calculate(saved, analysis), known);
assert.deepEqual(validateTool(saved), sampleTool);
assert.throws(() => validateTool({ ...saved, arbitraryMetadata: true }));

// Reject excessive input before recursive schema parsing can overflow the stack.
let deeplyNested: Expr = 1;
for (let i = 0; i < 20000; i++)
  deeplyNested = { op: "abs", args: [deeplyNested] };
assert.throws(
  () => validateTool(tool([metric("too_deep", deeplyNested)])),
  (error) =>
    error instanceof Error &&
    !(error instanceof RangeError) &&
    /too complex/.test(error.message),
);

// A tracking score is model output, not a probability bounded by one.
const strongPoint = p(10, 5, 2.4);
assert.deepEqual(jointMeasurement(strongPoint, "point", 0.01, 20), [0.1, 0.15]);
assert.equal(jointMeasurement(strongPoint, "speed"), 5);
const strongTracks = structuredClone(analysis);
strongTracks.frames[0].joints.right_wrist = strongPoint;
assert.equal(calculate(sampleTool, strongTracks).frames.wrist_speed[0], 5);
for (const badPoint of [
  undefined,
  p(10, 5, 0.1),
  { ...strongPoint, x: NaN },
  { ...strongPoint, confidence: Infinity },
]) {
  assert.equal(jointMeasurement(badPoint, "point"), null);
  assert.equal(jointMeasurement(badPoint, "speed"), null);
}
assert.equal(jointMeasurement({ ...strongPoint, vx: Infinity }, "speed"), null);
assert.equal(
  jointMeasurement({ ...strongPoint, ay: NaN }, "acceleration"),
  null,
);
assert.equal(jointMeasurement({ ...strongPoint, x: 1e308 }, "x", 1e308), null);
assert.equal(jointMeasurement(strongPoint, "speed", 0), null);
assert.equal(jointMeasurement(strongPoint, "y", 1, Infinity), null);
assert.equal(
  jointMeasurement(unavailable.frames[1].joints.right_wrist, "speed"),
  missing.frames.wrist_speed[1],
);

// Missing boundary frames do not silently move a baseline to another sample.
const boundaries = tool([
  metric("height", { op: "y", joint: "right_wrist" }, "length"),
  metric(
    "first",
    { op: "initial", args: [ref("height")] },
    "length",
    "summary",
  ),
  metric("last", { op: "final", args: [ref("height")] }, "length", "summary"),
  metric(
    "mean_height",
    { op: "mean", args: [ref("height")] },
    "length",
    "summary",
  ),
]);
const missingBoundaries = structuredClone(analysis);
missingBoundaries.frames[0].joints.right_wrist!.confidence = 0.1;
missingBoundaries.frames[2].joints.right_wrist!.confidence = 0.1;
const boundaryValues = calculate(boundaries, missingBoundaries);
assert.equal(boundaryValues.summaries.first, null);
assert.equal(boundaryValues.summaries.last, null);
assert.equal(boundaryValues.summaries.mean_height, 20);
console.log(
  "Math verification passed: geometry, calibration, custom summaries, saved tools, bounded JSON, tracking scores, missing boundaries, finite measurements and invalid operations.",
);
