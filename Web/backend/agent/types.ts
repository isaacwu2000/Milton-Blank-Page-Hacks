import type { SavedTool } from "../../shared";

export type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type Call = { id: string; type: "function"; function: { name: string; arguments: string } };
export type Chat = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Part[];
  tool_calls?: Call[];
  tool_call_id?: string;
  responseItems?: Record<string, unknown>[];
  reasoning_details?: unknown[];
};
export type Tool = { name: string; description: string; parameters: Record<string, unknown> };
export type Job = {
  status: "running" | "complete" | "failed";
  stage: string;
  tool?: SavedTool;
  reply?: string;
  drill?: { title: string; instructions: string };
  error?: string;
  createdAt: number;
};
