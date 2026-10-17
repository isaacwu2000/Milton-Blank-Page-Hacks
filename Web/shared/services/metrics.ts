import {
  JOINTS,
  toolSchema,
  savedToolSchema,
  type Analysis,
  type Expr,
  type Frame,
  type Point,
  type ToolConfig,
} from "../types";
type Unit =
  | "point"
  | "length"
  | "speed"
  | "acceleration"
  | "angle"
  | "number"
  | "time";
type Value = number | [number, number] | null;
const fields: Record<string, Unit> = {
  x: "length",
  y: "length",
  vx: "speed",
  vy: "speed",
  ax: "acceleration",
  ay: "acceleration",
};
const jointOps = [
  "point",
  "x",
  "y",
  "vx",
  "vy",
  "ax",
  "ay",
  "speed",
  "acceleration",
];
const reducers = ["max", "min", "mean", "range", "initial", "final"];
export const CAPABILITIES = `JSON math operations (no executable code): point(joint), x/y/vx/vy/ax/ay(joint), speed(joint), acceleration(joint), time, constant(value), metric(metric=id). point values support midpoint(point A, point B), x(point), y(point), angle(point A, point vertex B, point C) in degrees, distance(point A, point B). Scalar arithmetic: add/subtract(same units), multiply(one dimensionless operand, or speed*time=length, acceleration*time=speed), divide(by number, same units=number, length/time=speed, speed/time=acceleration), abs, sqrt(number). Numbers/constants are dimensionless. Summary reducers max/min/mean/range/initial/final take exactly one {op:'metric',metric:'earlier_frame_id'}; reducers ignore missing samples except initial/final which use the exact first/last sample. Summaries may combine reducers and earlier summary metrics using arithmetic. Frame metrics may reference earlier frame metrics. No forward references or cycles. Unit types: length, speed, acceleration, angle, number, time. Coordinates: x starts at left edge, y increases upward from initial foot baseline; distances are pixels unless calibrated (then meters), time is seconds. Target length/speed/acceleration thresholds are SI units and must not be evaluated before calibration. Missing, non-finite, or confidence below 0.35 yields null. Angle of overlapping points yields null. Single-camera measurements are 2D projections; do not assert true jump height without calibration and baseline/plane assumptions.`;

/** Formula diagnostics retain an exact JSON pointer and expected/actual values for agent repair. */
export class ToolValidationError extends Error {
  constructor(
    readonly path: string,
    readonly expected: unknown,
    readonly actual: unknown,
    message: string,
  ) {
    super(
      `${message} Path: ${path}. Expected: ${JSON.stringify(expected)}; actual: ${JSON.stringify(actual)}.`,
    );
    this.name = "ToolValidationError";
  }
}

/** Reject invalid dimensions, mixed scopes and executable content before saving. */
export function validateTool(raw: unknown): ToolConfig {
  // Bound raw input before recursive schema parsing can consume the call stack.
  const pending: { value: unknown; depth: number }[] = [
    { value: raw, depth: 0 },
  ];
  let rawNodes = 0;
  while (pending.length) {
    const entry = pending.pop()!;
    if (++rawNodes > 8000 || entry.depth > 50)
      throw Error("Tool configuration is too complex.");
    if (entry.value && typeof entry.value === "object")
      for (const value of Object.values(entry.value))
        pending.push({ value, depth: entry.depth + 1 });
  }
  const parsed = toolSchema.or(savedToolSchema).parse(raw);
  const {
    id: _id,
    createdAt: _createdAt,
    ...tool
  } = parsed as ToolConfig & { id?: string; createdAt?: string };
  let nodes = 0;
  // Ordered metric definitions form an acyclic dependency graph: only earlier entries may be referenced.
  const known = new Map<string, { unit: Unit; scope: string }>();
  for (const [index, metric] of tool.metrics.entries()) {
    if (known.has(metric.id))
      throw new ToolValidationError(
        `/metrics/${index}/id`,
        "unique metric ID",
        metric.id,
        `Duplicate metric: ${metric.id}`,
      );
    function type(
      e: Expr,
      depth = 0,
      insideReducer = false,
      path = `/metrics/${index}/formula`,
    ): Unit {
      const fail = (
        message: string,
        expected: unknown,
        actual: unknown,
      ): never => {
        throw new ToolValidationError(path, expected, actual, message);
      };
      if (++nodes > 500 || depth > 16)
        fail("Calculation is too complex.", "at most 500 nodes and depth 16", {
          nodes,
          depth,
        });
      if (typeof e === "number") return "number";
      const args = e.args ?? [];
      const expect = (count: number) => {
        if (args.length !== count)
          throw new ToolValidationError(
            path + "/args",
            count,
            args.length,
            `${e.op} needs ${count} arguments.`,
          );
      };
      const allowed = [
        "op",
        "args",
        ...(jointOps.includes(e.op) ? ["joint"] : []),
        ...(e.op === "constant" ? ["value"] : []),
        ...(e.op === "metric" ? ["metric"] : []),
      ];
      if (Object.keys(e).some((key) => !allowed.includes(key)))
        fail(`Unexpected property for ${e.op}.`, allowed, Object.keys(e));
      // A summary reducer temporarily reads the frame scope; nested reducers would double aggregate.
      if (reducers.includes(e.op)) {
        expect(1);
        const ref = args[0];
        if (
          metric.scope !== "summary" ||
          insideReducer ||
          typeof ref === "number" ||
          ref.op !== "metric"
        )
          fail(
            "Summary reducer needs one earlier frame metric reference.",
            "one earlier frame metric in a summary reducer",
            ref,
          );
        return type(ref, depth + 1, true, path + "/args/0");
      }
      if (e.op === "metric") {
        expect(0);
        const ref = known.get(e.metric ?? "");
        const scope = insideReducer ? "frame" : metric.scope;
        if (!ref || ref.scope !== scope)
          fail(
            `Metric reference must name an earlier ${scope} metric${metric.scope === "summary" && !insideReducer ? " (use a reducer for frame metrics)" : ""}.`,
            [...known]
              .filter(([, item]) => item.scope === scope)
              .map(([id]) => id),
            e.metric,
          );
        return ref!.unit;
      }
      if (e.op === "constant") {
        expect(0);
        if (e.value === undefined)
          fail(
            "Constant needs a value.",
            "finite dimensionless number",
            e.value,
          );
        return "number";
      }
      if (
        metric.scope === "summary" &&
        (jointOps.includes(e.op) || e.op === "time")
      )
        fail(
          "Summary measurements must use a frame metric reducer.",
          "reducer referencing an earlier frame metric",
          e.op,
        );
      if (jointOps.includes(e.op)) {
        if ((e.op === "x" || e.op === "y") && args.length === 1) {
          const unit = type(args[0], depth + 1, false, path + "/args/0");
          if (e.joint || unit !== "point")
            fail(
              "Coordinate needs one point or a joint.",
              "one point argument without joint",
              { unit, joint: e.joint },
            );
          return "length";
        }
        expect(0);
        if (!e.joint || !JOINTS.includes(e.joint))
          fail(`${e.op} needs a supported joint.`, JOINTS, e.joint);
        return e.op === "point"
          ? "point"
          : e.op === "speed"
            ? "speed"
            : e.op === "acceleration"
              ? "acceleration"
              : fields[e.op];
      }
      if (e.op === "time") {
        expect(0);
        return "time";
      }
      const units = args.map((value, argIndex) =>
        type(value, depth + 1, false, `${path}/args/${argIndex}`),
      );
      if (["angle", "distance", "midpoint"].includes(e.op)) {
        expect(e.op === "angle" ? 3 : 2);
        if (units.some((unit) => unit !== "point"))
          fail(`${e.op} needs points.`, "point operands", units);
        return e.op === "angle"
          ? "angle"
          : e.op === "midpoint"
            ? "point"
            : "length";
      }
      if (e.op === "abs" || e.op === "sqrt") {
        expect(1);
        if (units[0] === "point" || (e.op === "sqrt" && units[0] !== "number"))
          fail(
            "Unsupported unary units.",
            e.op === "sqrt" ? "number" : "scalar",
            units,
          );
        return units[0];
      }
      expect(2);
      if (units.includes("point"))
        fail(
          "Use distance, midpoint or angle for points.",
          "scalar operands",
          units,
        );
      const [left, right] = units;
      if (["add", "subtract"].includes(e.op) && left === right) return left;
      if (e.op === "multiply") {
        if (left === "number" || right === "number")
          return left === "number" ? right : left;
        if (
          (left === "time" && right === "speed") ||
          (right === "time" && left === "speed")
        )
          return "length";
        if (
          (left === "time" && right === "acceleration") ||
          (right === "time" && left === "acceleration")
        )
          return "speed";
      }
      if (e.op === "divide") {
        if (right === "number") return left;
        if (left === right) return "number";
        if (right === "time" && left === "length") return "speed";
        if (right === "time" && left === "speed") return "acceleration";
      }
      return fail(
        `Unsupported operation or incompatible units: ${e.op}`,
        ["add", "subtract"].includes(e.op)
          ? "same scalar units"
          : e.op === "multiply"
            ? "one dimensionless operand, speed*time, or acceleration*time"
            : "division by number, matching units, length/time, or speed/time",
        units,
      );
    }
    const actualUnit = type(metric.formula);
    if (actualUnit !== metric.unit)
      throw new ToolValidationError(
        `/metrics/${index}/formula`,
        metric.unit,
        actualUnit,
        `Unit mismatch for ${metric.name}.`,
      );
    if (
      metric.target &&
      metric.target.min !== undefined &&
      metric.target.max !== undefined &&
      metric.target.min > metric.target.max
    )
      throw new ToolValidationError(
        `/metrics/${index}/target/min`,
        `at most ${metric.target.max}`,
        metric.target.min,
        `Target minimum exceeds maximum for ${metric.name}.`,
      );
    known.set(metric.id, { unit: metric.unit, scope: metric.scope });
  }
  return tool;
}

/** Calculates only from available measurements. Missing evidence remains null. */
export function calculate(
  tool: ToolConfig,
  analysis: Analysis,
  scale = 1,
  ground = analysis.ground,
) {
  tool = validateTool(tool);
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(ground))
    throw Error("Calibration must have a finite ground and positive scale.");
  const frameValues: Record<string, (number | null)[]> = {};
  const summaries: Record<string, number | null> = {};
  const finite = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);
  function evalExpr(
    e: Expr,
    frame: Frame,
    index: number,
    summary = false,
  ): Value {
    if (typeof e === "number") return e;
    const args = e.args ?? [];
    if ((e.op === "x" || e.op === "y") && args.length) {
      const point = evalExpr(args[0], frame, index);
      return Array.isArray(point) ? point[e.op === "x" ? 0 : 1] : null;
    }
    if (jointOps.includes(e.op))
      return jointMeasurement(
        e.joint ? frame.joints[e.joint] : undefined,
        e.op as JointMeasure,
        scale,
        ground,
      );
    if (e.op === "constant") return e.value ?? null;
    if (e.op === "time") return finite(frame.time) ? frame.time : null;
    if (e.op === "metric")
      return summary
        ? (summaries[e.metric ?? ""] ?? null)
        : (frameValues[e.metric ?? ""]?.[index] ?? null);
    if (reducers.includes(e.op)) {
      const ref = args[0];
      const all =
        typeof ref === "object" ? (frameValues[ref.metric ?? ""] ?? []) : [];
      if (e.op === "initial") return all[0] ?? null;
      if (e.op === "final") return all.at(-1) ?? null;
      const valid = all.filter(finite);
      if (!valid.length) return null;
      const min = Math.min(...valid),
        max = Math.max(...valid);
      return e.op === "max"
        ? max
        : e.op === "min"
          ? min
          : e.op === "range"
            ? max - min
            : valid.reduce((sum, value) => sum + value / valid.length, 0);
    }
    const values = args.map((value) => evalExpr(value, frame, index, summary));
    if (values.some((value) => value === null)) return null;
    if (e.op === "midpoint") {
      const [p, q] = values as number[][];
      return [p[0] / 2 + q[0] / 2, p[1] / 2 + q[1] / 2];
    }
    if (e.op === "distance") {
      const [p, q] = values as number[][];
      return Math.hypot(p[0] - q[0], p[1] - q[1]);
    }
    if (e.op === "angle") {
      const [p, q, r] = values as number[][];
      const ux = p[0] - q[0],
        uy = p[1] - q[1],
        vx = r[0] - q[0],
        vy = r[1] - q[1];
      const uLength = Math.hypot(ux, uy),
        vLength = Math.hypot(vx, vy);
      if (uLength === 0 || vLength === 0) return null;
      return (
        (Math.acos(
          Math.max(
            -1,
            Math.min(
              1,
              (ux / uLength) * (vx / vLength) + (uy / uLength) * (vy / vLength),
            ),
          ),
        ) *
          180) /
        Math.PI
      );
    }
    const [x, y] = values as number[];
    const arithmetic: Record<string, () => number> = {
      add: () => x + y,
      subtract: () => x - y,
      multiply: () => x * y,
      divide: () => (y === 0 ? NaN : x / y),
      abs: () => Math.abs(x),
      sqrt: () => Math.sqrt(x),
    };
    const result = arithmetic[e.op]?.();
    return finite(result) ? result : null;
  }
  for (const metric of tool.metrics) {
    if (metric.scope === "frame")
      frameValues[metric.id] = analysis.frames.map((frame, index) => {
        const value = evalExpr(metric.formula, frame, index);
        return finite(value) ? value : null;
      });
    else {
      const value = analysis.frames.length
        ? evalExpr(metric.formula, analysis.frames[0], 0, true)
        : null;
      summaries[metric.id] = finite(value) ? value : null;
    }
  }
  return { frames: frameValues, summaries };
}
/** Physical targets use SI; evaluating them against raw pixels would mislead. */
export function metricTarget(
  metric: ToolConfig["metrics"][number],
  calibrated: boolean,
) {
  return !calibrated &&
    ["length", "speed", "acceleration"].includes(metric.unit)
    ? undefined
    : metric.target;
}
export function unitLabel(unit: string, calibrated: boolean) {
  return (
    (
      {
        length: calibrated ? "m" : "px",
        speed: calibrated ? "m/s" : "px/s",
        acceleration: calibrated ? "m/s²" : "px/s²",
        angle: "°",
        time: "s",
        number: "",
      } as Record<string, string>
    )[unit] ?? ""
  );
}

export type JointMeasure =
  | "point"
  | "x"
  | "y"
  | "vx"
  | "vy"
  | "ax"
  | "ay"
  | "speed"
  | "acceleration";
/** One confidence, coordinate, and finite-arithmetic policy for both JSON math and the inspector. */
export function jointMeasurement(
  point: Point | undefined,
  measure: JointMeasure,
  scale = 1,
  ground = 0,
): number | [number, number] | null {
  const finite = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v);
  if (
    !point ||
    !finite(point.confidence) ||
    point.confidence < 0.35 ||
    !finite(point.x) ||
    !finite(point.y) ||
    !finite(scale) ||
    scale <= 0 ||
    !finite(ground)
  )
    return null;
  let value: number | [number, number] | null;
  if (measure === "point")
    value = [point.x * scale, (ground - point.y) * scale];
  else if (measure === "speed")
    value =
      finite(point.vx) && finite(point.vy)
        ? Math.hypot(point.vx, point.vy) * scale
        : null;
  else if (measure === "acceleration")
    value =
      finite(point.ax) && finite(point.ay)
        ? Math.hypot(point.ax, point.ay) * scale
        : null;
  else if (measure === "x") value = point.x * scale;
  else if (measure === "y") value = (ground - point.y) * scale;
  else {
    const derivative = point[measure];
    value = finite(derivative)
      ? derivative * scale * (measure === "vy" || measure === "ay" ? -1 : 1)
      : null;
  }
  return Array.isArray(value)
    ? value.every(finite)
      ? value
      : null
    : finite(value)
      ? value
      : null;
}
