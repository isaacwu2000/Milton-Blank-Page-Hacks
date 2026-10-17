import { z } from "zod";
export const JOINTS = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
] as const;
export type Joint = (typeof JOINTS)[number];
export type Point = {
  x: number;
  y: number;
  vx: number | null;
  vy: number | null;
  ax: number | null;
  ay: number | null;
  confidence: number;
};
export type Frame = {
  time: number;
  joints: Partial<Record<Joint, Point>>;
  image?: string;
};
export type Analysis = {
  id: string;
  width: number;
  height: number;
  ground: number;
  groundTime?: number;
  groundSource?: "person_boundary";
  duration: number;
  interval: number;
  frames: Frame[];
  source: "sample" | "video";
  model: string;
};
export type Expr =
  | number
  | {
      op: string;
      args?: Expr[];
      joint?: Joint;
      field?: string;
      metric?: string;
      value?: number;
    };
export const expression: z.ZodType<Expr> = z.lazy(() =>
  z.union([
    z.number().finite(),
    z
      .object({
        op: z.string(),
        args: z.array(expression).max(8).optional(),
        joint: z.enum(JOINTS).optional(),
        field: z.string().optional(),
        metric: z.string().optional(),
        value: z.number().finite().optional(),
      })
      .strict(),
  ]),
);
export const metricSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    name: z.string().min(1).max(80),
    description: z.string().max(300),
    scope: z.enum(["frame", "summary"]),
    formula: expression,
    unit: z.enum([
      "length",
      "speed",
      "acceleration",
      "angle",
      "number",
      "time",
    ]),
    target: z
      .object({
        min: z.number().finite().optional(),
        max: z.number().finite().optional(),
        message: z.string().max(200),
      })
      .optional(),
  })
  .strict();
export const toolSchema = z
  .object({
    format: z.literal(1),
    name: z.string().min(1).max(80),
    sport: z.string().min(1).max(60),
    audience: z.string().min(1).max(120),
    description: z.string().max(300),
    rubric: z.string().min(1).max(4000),
    coachPrompt: z.string().min(1).max(4000),
    metrics: z.array(metricSchema).min(1).max(12),
    focusJoint: z.enum(JOINTS),
    referenceId: z.string().optional(),
  })
  .strict();
export type ToolConfig = z.infer<typeof toolSchema>;
export const savedToolSchema = toolSchema
  .extend({
    id: z.string().uuid(),
    hidden: z.boolean().optional(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type SavedTool = ToolConfig & { id: string; createdAt: string; hidden?: boolean };
export type Profile = {
  id: string;
  name: string;
  heightCm?: number;
  weightKg?: number | null;
  gender?: string;
  dominantSide?: string;
  experience?: string;
  notes?: string;
};
export type Session = {
  id: string;
  name: string;
  createdAt: string;
  profileId: string;
  toolId: string;
  status: "uploaded" | "queued" | "processing" | "complete" | "failed";
  progress: number;
  error?: string;
  duration: number;
  interval: number;
  sourceKey: string;
  analysisKey?: string;
  ground?: number;
  calibration?: {
    metersPerPixel: number;
    ground: number;
    source?: "athlete_height_auto" | "assumed_height_auto" | "athlete_height_manual" | "known_distance";
    heightCm?: number;
    bodyHeightPixels?: number;
    frameTime?: number;
  };
  alignment?: { current: number; reference: number };
  completedDrills?: string[];
};
export type Message = { role: "user" | "assistant"; content: string };

export type CoachFeedback = {
  doingWell: string[];
  improve: string[];
  limitations: string[];
};
export type CoachDrill = {
  title: string;
  instructions: string;
  steps?: string[];
};
