import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { app } from "./runtime/server";
import { sampleTool } from "../../shared";
import { streamChat } from "./services/provider";
vi.mock("./services/provider", async (original) => ({
  ...(await original<typeof import("./services/provider")>()),
  streamChat: vi.fn(),
}));
let server: Server, base: string;
const nativeFetch = globalThis.fetch;
beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((done) => server.close(() => done()));
});
const post = (path: string, body: unknown) =>
  nativeFetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
it("publishes a validated create and saves the immutable server copy exactly once without Daytona", async () => {
  vi.mocked(streamChat).mockImplementation(async function* () {
    yield '{"type":"text","text":"Here is a draft coach."}\n';
    yield JSON.stringify({ type: "create", tool: sampleTool }) +
      '\n{"type":"commit","baseRevision":0,"ready":false}';
  });
  const response = await post("/agent/builder/stream", {
    messages: [{ role: "user", content: "Build" }],
    revision: 0,
  });
  expect(response.headers.get("content-type")).toContain(
    "application/x-ndjson",
  );
  const events = (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(events[0]).toEqual({ type: "text", text: "Here is a draft coach." });
  const complete = events.at(-1);
  expect(complete).toMatchObject({
    type: "complete",
    preview: sampleTool,
    revision: 1,
    timings: { completeMs: expect.any(Number) },
  });
  expect(complete.id).toEqual(expect.any(String));
  vi.stubEnv("AGENT_INTERNAL_SECRET", "test-internal");
  const saving = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        ...sampleTool,
        id: "saved",
        createdAt: new Date().toISOString(),
      }),
    );
  vi.stubGlobal("fetch", saving);
  const results = await Promise.all([
    post(`/agent/jobs/${complete.id}/save`, { name: "Injected" }),
    post(`/agent/jobs/${complete.id}/save`, {}),
  ]);
  expect(results.every((r) => r.ok)).toBe(true);
  expect(saving).toHaveBeenCalledOnce();
  expect(JSON.parse(saving.mock.calls[0][1].body)).toEqual(sampleTool);
});
it("keeps invalid input out of the model and returns an actionable error", async () => {
  const response = await post("/agent/builder/stream", {
    messages: [],
    revision: 0,
  });
  expect(response.status).toBe(422);
  expect(streamChat).not.toHaveBeenCalled();
});
