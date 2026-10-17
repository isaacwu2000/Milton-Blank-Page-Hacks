import type { CoachDrill, CoachFeedback, Profile, SavedTool, Session, ToolConfig } from "../../../../shared";
export type HomeData = {
  profiles: Profile[];
  tools: SavedTool[];
  sessions: Session[];
};
export type Brief = {
  name: string;
  sport: string;
  audience: string;
  rubric: string;
  metrics: string[];
};
export type AgentJob = {
  id?: string;
  status: string;
  stage: string;
  error?: string;
  tool?: SavedTool;
  preview?: ToolConfig;
  previewRevision?: number;
  timings?: { previewMs?: number; reviewMs?: number };
  reply?: string;
  drill?: CoachDrill;
  feedback?: CoachFeedback;
};
