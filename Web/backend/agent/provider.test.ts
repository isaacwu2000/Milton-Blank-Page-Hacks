import { afterEach, describe, expect, it, vi } from "vitest";
import { chat } from "./services/provider";
import { config, provider } from "./config";
import type { Chat, Tool } from "./types";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const tools: Tool[] = [{ name: "draft_tool", description: "Review a draft", parameters: { type: "object", properties: { source: { type: "object" } }, required: ["source"] } }];
const call = { id: "call-1", type: "function" as const, function: { name: "draft_tool", arguments: '{"source":{"name":"Reach"}}' } };
const messages: Chat[] = [
  { role: "system", content: "Use measured evidence." },
  { role: "assistant", content: "", tool_calls: [call] },
  { role: "tool", tool_call_id: "call-1", content: [{ type: "text", text: "Actual browser inspection" }, { type: "image_url", image_url: { url: "data:image/png;base64,actual-inspection-pixels", detail: "high" } }] },
];

describe("provider wire parity", () => {
  it("selects production OpenRouter or development ChatGPT unless explicitly overridden", () => {
    vi.stubEnv("SOL_PROVIDER", undefined);
    vi.stubEnv("NODE_ENV", "production");
    expect(provider()).toBe("openrouter");
    vi.stubEnv("NODE_ENV", "development");
    expect(provider()).toBe("chatgpt");
    vi.stubEnv("SOL_PROVIDER", "openrouter");
    expect(provider()).toBe("openrouter");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SOL_PROVIDER", "chatgpt");
    expect(provider()).toBe("chatgpt");
  });
  it("preserves the same tools, medium reasoning, images and normalized tool decision across providers", async () => {
    const bodies: Record<string, any> = {};
    const results = [];
    for (const provider of ["chatgpt", "openrouter"]) {
      vi.stubEnv("SOL_PROVIDER", provider);
      vi.stubEnv("OPENROUTER_API_KEY", "test-only-provider-key");
      const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
        bodies[provider] = JSON.parse(String(init?.body));
        return Response.json(provider === "chatgpt"
          ? { status: "completed", output: [{ type: "function_call", call_id: call.id, name: call.function.name, arguments: call.function.arguments }] }
          : { choices: [{ message: { role: "assistant", content: null, tool_calls: [call], reasoning_details: [{ type: "reasoning.encrypted", data: "opaque-private-reasoning" }] } }] });
      });
      vi.stubGlobal("fetch", fetcher);
      results.push(await chat(messages, tools));
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    expect(results[0].tool_calls).toEqual(results[1].tool_calls);
    expect(results[1].reasoning_details).toEqual([{ type: "reasoning.encrypted", data: "opaque-private-reasoning" }]);
    expect(bodies.chatgpt.reasoning).toEqual(bodies.openrouter.reasoning);
    expect(bodies.chatgpt.reasoning.effort).toBe("medium");
    expect(bodies.chatgpt.model).toBe(config.model.replace("openai/", ""));
    expect(bodies.openrouter.model).toBe(config.model);
    expect(bodies.chatgpt.tools[0].parameters).toEqual(bodies.openrouter.tools[0].function.parameters);
    expect(bodies.chatgpt.input.find((item: any) => item.type === "function_call_output").output).toBe("Actual browser inspection");
    expect(bodies.chatgpt.input.at(-1).content.at(-1).image_url).toContain("actual-inspection-pixels");
    expect(bodies.openrouter.messages.at(-2)).toMatchObject({ role: "tool", content: "Actual browser inspection" });
    expect(bodies.openrouter.messages.at(-1).content.at(-1).image_url.url).toContain("actual-inspection-pixels");
  });

  it("never falls back to OpenRouter after a local provider failure", async () => {
    vi.stubEnv("SOL_PROVIDER", "chatgpt");
    vi.stubEnv("OPENROUTER_API_KEY", "test-only-provider-key");
    const fetcher = vi.fn(async (_url: unknown) => Response.json({ error: "rate limited" }, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(chat([{ role: "user", content: "Review this." }])).rejects.toThrow("No alternate provider was used");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${config.localProxyUrl}/responses`);
  });

  it("replays opaque Responses output items exactly between tool turns", async () => {
    vi.stubEnv("SOL_PROVIDER", "chatgpt");
    const output = [{ type: "reasoning", id: "reasoning-1", encrypted_content: "opaque-private-content" }, { type: "function_call", call_id: "call-1", name: "draft_tool", arguments: "{}" }];
    const bodies: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return Response.json({ status: "completed", output }); }));
    const response = await chat([{ role: "user", content: "Build." }], tools);
    await chat([response, { role: "tool", tool_call_id: "call-1", content: "Draft inspected." }], tools);
    expect(bodies[1].input.slice(0, 2)).toEqual(output);
    expect(bodies[1].input[2]).toEqual({ type: "function_call_output", call_id: "call-1", output: "Draft inspected." });
  });
});
