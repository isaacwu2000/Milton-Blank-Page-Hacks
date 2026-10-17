import { createServer, type Server } from "node:http";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { app } from "./runtime/server";
import { chat } from "./services/provider";
import { makeSample, sampleTool } from "../../shared";

vi.mock("./services/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/provider")>()),
  chat: vi.fn(),
}));
let server: Server;
let base: string;
const nativeFetch = globalThis.fetch;
const messages = [
  { role: "user", content: "Build a coach for my forehand squash serve." },
];
beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Test server did not start.");
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
function post(path: string, body: unknown) {
  return nativeFetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("builder and coach request boundary", () => {
  it("returns a complete validated preview from the first useful idea", async () => {
    vi.mocked(chat).mockResolvedValue({ role: "assistant", content: JSON.stringify({
      reply: "Here is a draft. Shall we use these defaults?", ready: false, preview: sampleTool,
    }) });
    const response = await post("/agent/interview", { messages });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ preview: sampleTool, ready: false });
  });
  it("never publishes a preview whose formula disagrees with its unit", async () => {
    const invalid = { ...sampleTool, metrics: [{ ...sampleTool.metrics[0], unit: "speed" }] };
    vi.mocked(chat).mockResolvedValue({ role: "assistant", content: JSON.stringify({
      reply: "Here is your coach", ready: false, preview: invalid,
    }) });
    const response = await post("/agent/interview", { messages });
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("preview");
  });
  it("answers a valid first builder prompt when the model has no brief yet", async () => {
    vi.mocked(chat).mockResolvedValue({
      role: "assistant",
      content: '{"reply":"Who is this for?","ready":false,"brief":null}',
    });
    const response = await post("/agent/interview", { messages });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reply: "Who is this for?",
      ready: false,
    });
  });
  it("keeps malformed model output separate from invalid user requests", async () => {
    vi.mocked(chat).mockResolvedValue({
      role: "assistant",
      content: '{"reply":"Question","ready":"false"}',
    });
    const response = await post("/agent/interview", { messages });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "The AI returned an incomplete response. Please retry your message.",
    });
  });
  it("still rejects invalid user messages before contacting the model", async () => {
    const response = await post("/agent/interview", { messages: [] });
    expect(response.status).toBe(422);
    expect(chat).not.toHaveBeenCalled();
  });
  it("completes a footage coaching job when no drill is suggested", async () => {
    const sessionId = "ecf1dc5a-8808-411e-bd7e-65d0ff337aee";
    const sample = makeSample();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/analysis?images=true"))
          return Response.json({
            ...sample,
            source: "video",
            frames: [{ ...sample.frames[0], image: "fixture-image" }],
          });
        if (url.endsWith(`/api/sessions/${sessionId}`))
          return Response.json({ id: sessionId, profileId: "athlete" });
        if (url.endsWith("/api/home"))
          return Response.json({ profiles: [], sessions: [] });
        throw Error("Unexpected backend request");
      }),
    );
    vi.mocked(chat)
      .mockResolvedValueOnce({
        role: "assistant",
        content: "At 0 seconds, the knee is bent.",
      })
      .mockResolvedValueOnce({
        role: "assistant",
        content: '{"reply":"Your knee is bent at 0 seconds.","drill":null}',
      });
    const response = await post("/agent/coach", {
      sessionId,
      tool: sampleTool,
      messages,
      selectedTime: 0,
    });
    expect(response.status).toBe(200);
    const { id } = await response.json();
    await vi.waitFor(async () => {
      const result = await nativeFetch(`${base}/agent/jobs/${id}`).then(
        (result) => result.json(),
      );
      expect(result).toMatchObject({
        status: "complete",
        reply: "Your knee is bent at 0 seconds.",
      });
      expect(result.drill).toBeUndefined();
    });
  });
});

it("stops an active coaching review and aborts its provider request", async () => {
  const sessionId = "ecf1dc5a-8808-411e-bd7e-65d0ff337aee";
  const sample = makeSample();
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/analysis?images=true")) return Response.json({ ...sample, source: "video", frames: [{ ...sample.frames[0], image: "fixture-image" }] });
    if (url.endsWith(`/api/sessions/${sessionId}`)) return Response.json({ id: sessionId, profileId: "athlete" });
    if (url.endsWith("/api/home")) return Response.json({ profiles: [], sessions: [] });
    throw Error("Unexpected backend request");
  }));
  vi.mocked(chat).mockImplementation((_messages, _tools, signal) => new Promise((_resolve, reject) => {
    signal?.addEventListener("abort", () => reject(Error("Aborted")), { once: true });
  }));
  const started = await post("/agent/coach", { sessionId, tool: sampleTool, messages, selectedTime: 0 }).then((response) => response.json());
  await vi.waitFor(() => expect(chat).toHaveBeenCalledTimes(1));
  const response = await post(`/agent/jobs/${started.id}/cancel`, {});
  expect(response.status).toBe(200);
  expect(vi.mocked(chat).mock.calls[0][2]?.aborted).toBe(true);
  const stopped = await nativeFetch(`${base}/agent/jobs/${started.id}`).then((result) => result.json());
  expect(stopped).toMatchObject({ status: "failed", stage: "Stopped", error: "Review stopped. You can edit your question and retry." });
  expect(stopped.reply).toBeUndefined();
});
