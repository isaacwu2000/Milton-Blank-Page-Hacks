import { afterEach, expect, it, vi } from "vitest";
import { streamChat } from "./services/provider";
const encode = new TextEncoder();
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it.each(["chatgpt", "openrouter"])(
  "streams %s text before the provider completes and preserves medium reasoning",
  async (provider) => {
    vi.stubEnv("SOL_PROVIDER", provider);
    vi.stubEnv("OPENROUTER_API_KEY", "test-provider-key");
    let wire!: ReadableStreamDefaultController<Uint8Array>;
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            wire = controller;
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const stream = streamChat(
      [{ role: "user", content: "Build a coach" }],
      new AbortController().signal,
    );
    const first = stream.next();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    const text =
      provider === "chatgpt"
        ? { type: "response.output_text.delta", delta: "Hello" }
        : { choices: [{ delta: { content: "Hello" } }] };
    const line = "data: " + JSON.stringify(text) + "\n\n";
    wire.enqueue(encode.encode(line.slice(0, 12)));
    wire.enqueue(encode.encode(line.slice(12)));
    expect(await first).toEqual({ value: "Hello", done: false });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({
      stream: true,
      reasoning: { effort: "medium" },
    });
    const end =
      provider === "chatgpt"
        ? { type: "response.completed", response: { status: "completed" } }
        : { choices: [{ delta: {}, finish_reason: "stop" }] };
    wire.enqueue(
      encode.encode("data: " + JSON.stringify(end) + "\n\ndata: [DONE]\n\n"),
    );
    wire.close();
    expect(await stream.next()).toMatchObject({ done: true });
  },
);
it("rejects a truncated model stream even after receiving valid-looking text", async () => {
  vi.stubEnv("SOL_PROVIDER", "chatgpt");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          'data: {"type":"response.output_text.delta","delta":"{}"}\n\n',
        ),
      ),
  );
  const read = async () => {
    for await (const _ of streamChat([], new AbortController().signal)) {
      void _;
    }
  };
  await expect(read()).rejects.toThrow(/before completion/);
});
