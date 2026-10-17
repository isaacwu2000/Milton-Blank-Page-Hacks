import { makeSample } from "../../../../shared";
import type { HomeData } from "./types";
export const EMPTY_HOME_DATA: HomeData = {
  profiles: [],
  tools: [],
  sessions: [],
};
export const SAMPLE = makeSample();
export const DEFAULT_SAMPLING_INTERVAL = 0.1;
export const SAMPLING_RANGE = { min: 0.05, max: 2, step: 0.05 } as const;
export const BUILDER_WELCOME =
  "What sport or movement would you like to build a coaching tool for, and what would you like it to help with?";
export const BUILDER_EXAMPLE =
  "Build a beginner squat coach. Track knee and hip angles and vertical hip movement, summarize range of motion, and coach a comfortable controlled squat with knees following the direction of the feet. Ask me what else you need.";

export const POLLING = {
  agentJobMs: 1200,
  agentStartTimeoutMs: 15_000,
  agentStatusTimeoutMs: 15_000,
  agentMaxWaitMs: 16 * 60_000,
  agentStageMs: 1500,
  videoStatusMs: 1800,
  signedUrlRefreshMs: 12 * 60 * 1000,
} as const;

export const READ_RETRY = {
  attempts: 4,
  baseDelayMs: 500,
  statuses: [500, 502, 503, 504] as readonly number[],
} as const;
