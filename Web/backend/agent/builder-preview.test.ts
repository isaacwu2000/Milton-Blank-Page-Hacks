import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { app } from "./runtime/server";
import { sampleTool } from "../../shared";
import { chat } from "./services/provider";

vi.mock("./services/provider", () => ({
  chat: vi.fn(),
  parseJSON: JSON.parse,
}));
const review = vi.hoisted(() => ({
  browse: vi.fn(),
  start: vi.fn(),
  close: vi.fn(),
}));
vi.mock("./runtime/sandbox", () => ({
  BuildSandbox: class {
    start = review.start;
    close = review.close;
    browse = review.browse;
    setDraft() {}
    async write() {}
  },
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
const status = (id: string) =>
  nativeFetch(`${base}/agent/jobs/${id}`).then((r) => r.json());

it("shows a math-checked draft before remote review, but only saves the accepted revision once", async () => {
  vi.stubEnv("AGENT_INTERNAL_SECRET", "test-internal-connection");
  let finish!: () => void;
  review.start.mockImplementation(
    () =>
      new Promise<void>((done) => {
        finish = done;
      }),
  );
  review.browse.mockResolvedValue({
    text: sampleTool.name,
    errors: [],
    screenshot: "data:image/png;base64,fixture",
  });
  vi.mocked(chat).mockResolvedValue({
    role: "assistant",
    content: "",
    tool_calls: [
      {
        id: "accept",
        type: "function",
        function: { name: "submit_tool", arguments: '{"revision":1}' },
      },
    ],
  });
  const save = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        ...sampleTool,
        id: "saved",
        createdAt: new Date().toISOString(),
      }),
    );
  vi.stubGlobal("fetch", save);
  const started = await post("/agent/build", {
    candidate: sampleTool,
    save: false,
    messages: [{ role: "user", content: "Build this coach" }],
  }).then((r) => r.json());
  await vi.waitFor(async () =>
    expect(await status(started.id)).toMatchObject({
      status: "running",
      preview: sampleTool,
    }),
  );
  expect((await post(`/agent/jobs/${started.id}/save`, {})).status).toBe(409);
  expect(save).not.toHaveBeenCalled();
  finish();
  await vi.waitFor(async () =>
    expect(await status(started.id)).toMatchObject({
      status: "complete",
      preview: sampleTool,
    }),
  );
  expect(save).not.toHaveBeenCalled();
  const [a, b] = await Promise.all([
    post(`/agent/jobs/${started.id}/save`, {}),
    post(`/agent/jobs/${started.id}/save`, {}),
  ]);
  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  expect(save).toHaveBeenCalledOnce();
  expect(JSON.parse(save.mock.calls[0][1].body)).toEqual(sampleTool);
});
