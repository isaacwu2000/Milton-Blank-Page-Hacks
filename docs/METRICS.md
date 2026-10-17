# Measurements and custom metrics

SportsBuilder uses JSON to configure trusted calculations. The model chooses operations and coaching criteria; it never supplies executable measurement code. The public TypeScript interface is `Web/shared/index.ts`.

## Coordinates and units

- `x=0` is the left image edge. Positive x points right.
- `y=0` starts at the initially detected feet. Positive y points up. Users can correct the ground line.
- Lengths use pixels until calibrated, then meters. Velocity uses px/s or m/s; acceleration uses px/s² or m/s². Angles use degrees and time uses seconds.
- Length, speed, and acceleration target thresholds use physical units and require calibration. Angle targets do not.

## Supported operations

| JSON `op`                                         | Inputs and result                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `point`                                           | `joint`: a supported body joint; returns its 2D position.                                                                                                      |
| `x`, `y`                                          | A `joint`, or one point in `args`; returns a coordinate.                                                                                                       |
| `vx`, `vy`, `ax`, `ay`                            | `joint`; signed velocity or acceleration component.                                                                                                            |
| `speed`, `acceleration`                           | `joint`; magnitude, always nonnegative.                                                                                                                        |
| `angle`                                           | Three points in `args`: endpoint, vertex, endpoint.                                                                                                            |
| `distance`, `midpoint`                            | Two points in `args`; returns length or a point.                                                                                                               |
| `time`, `constant`                                | Frame time, or a dimensionless `value`. Numeric literals are also dimensionless.                                                                               |
| `metric`                                          | `metric`: the ID of an earlier compatible metric.                                                                                                              |
| `add`, `subtract`                                 | Two scalars with matching units.                                                                                                                               |
| `multiply`, `divide`                              | Dimensionless scaling and supported length/time, speed/time, speed×time, acceleration×time conversions. Dividing matching units yields a dimensionless number. |
| `abs`, `sqrt`                                     | One scalar; square root requires dimensionless input.                                                                                                          |
| `min`, `max`, `mean`, `range`, `initial`, `final` | Summary operations taking one earlier frame-metric reference.                                                                                                  |

Each metric declares `scope` (`frame` or `summary`) and `unit` (`length`, `speed`, `acceleration`, `angle`, `number`, or `time`). Frame metrics can reference earlier frame metrics. Summaries combine reducers and earlier summary metrics using arithmetic. Forward references and cycles are rejected. A tool supports up to 12 metrics, with bounded expression depth and size.

For example, these entries can be placed in a tool's `metrics` array:

```json
[
  {
    "id": "elbow_angle",
    "name": "Elbow angle",
    "description": "Shoulder–elbow–wrist angle; 180 degrees is straight.",
    "scope": "frame",
    "unit": "angle",
    "formula": {
      "op": "angle",
      "args": [
        { "op": "point", "joint": "right_shoulder" },
        { "op": "point", "joint": "right_elbow" },
        { "op": "point", "joint": "right_wrist" }
      ]
    }
  },
  {
    "id": "extension_change",
    "name": "Extension from start",
    "description": "Maximum elbow angle minus its initial sampled angle.",
    "scope": "summary",
    "unit": "angle",
    "formula": {
      "op": "subtract",
      "args": [
        { "op": "max", "args": [{ "op": "metric", "metric": "elbow_angle" }] },
        {
          "op": "initial",
          "args": [{ "op": "metric", "metric": "elbow_angle" }]
        }
      ]
    }
  }
]
```

## Missing data and limits

Missing joints, tracking scores below 0.35, nonfinite values, division by zero, and angles with overlapping points produce `null`, displayed as unavailable. A tracking score is model output; it is not a calibrated probability and can exceed one.

Summary min/max/mean/range ignore missing samples and return unavailable if none remain. Initial/final use the exact boundary sample: a missing first frame must not silently change the baseline.

Tracking and coach images use the same adjustable interval. Derivatives use actual decoded timestamps and contiguous confident segments; they never bridge missing detections. For sufficiently long segments, positions are smoothed with a quadratic filter of up to seven samples before differentiating. Displayed positions remain the original detections. Velocity needs neighbors; acceleration needs more neighbors, so boundary values remain unavailable.

All measurements are single-camera 2D projections. Short sampling intervals may reveal more detail but do not guarantee accuracy. Calibration requires a known distance in the movement plane; perspective, occlusion, pose errors, and smoothing can change measurements. An angle alone does not establish good form, and a vertical hip displacement alone does not establish true jump height.
