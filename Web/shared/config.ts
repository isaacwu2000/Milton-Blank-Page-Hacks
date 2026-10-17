import type { Joint, ToolConfig } from "./types";
export const EDGES: [Joint, Joint][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];
export const sampleTool: ToolConfig = {
  format: 1,
  name: "Forehand, focused",
  sport: "Squash",
  audience: "Beginner players",
  description: "A clearer swing. One useful thing to practise.",
  rubric:
    "Aim for a balanced base and a comfortable, controlled elbow extension through the forehand. Compare the elbow angle across preparation and follow-through. Angle alone cannot establish good technique; consider the footage and avoid rigid universal thresholds.",
  coachPrompt:
    "Be a patient squash coach. Ground advice in the supplied footage and metrics. Choose one useful focus, explain the evidence and uncertainty, and give one short drill. Do not infer racket contact or ball speed from body joints.",
  focusJoint: "right_wrist",
  metrics: [
    {
      id: "elbow_angle",
      name: "Elbow angle",
      description:
        "Shoulder → elbow → wrist. Near 180° is straighter; lower values are more bent.",
      scope: "frame",
      formula: {
        op: "angle",
        args: [
          { op: "point", joint: "right_shoulder" },
          { op: "point", joint: "right_elbow" },
          { op: "point", joint: "right_wrist" },
        ],
      },
      unit: "angle",
    },
    {
      id: "wrist_speed",
      name: "Wrist speed",
      description: "Projected speed of the right wrist in the image plane.",
      scope: "frame",
      formula: { op: "speed", joint: "right_wrist" },
      unit: "speed",
    },
    {
      id: "peak_wrist_speed",
      name: "Peak wrist speed",
      description: "Largest available sampled wrist speed.",
      scope: "summary",
      formula: { op: "max", args: [{ op: "metric", metric: "wrist_speed" }] },
      unit: "speed",
    },
  ],
};
