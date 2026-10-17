import type { Profile, SavedTool, Session } from "../../../../shared";
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
  reply?: string;
  drill?: { title: string; instructions: string };
};
