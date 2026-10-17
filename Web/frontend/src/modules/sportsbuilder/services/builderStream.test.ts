import { afterEach, expect, it, vi } from "vitest";
import { streamBuilder } from "./builderStream";
const turn = {
  messages: [{ role: "user" as const, content: "Build a coach" }],
  revision: 0,
  force: false,
};
afterEach(() => vi.unstubAllGlobals());
it("renders split UTF-8 text before completion and withholds the transaction until EOF", async () => {
  let wire!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            wire = controller;
          },
        }),
      ),
    ),
  );
  const events = vi.fn();
  const reading = streamBuilder(turn, events, new AbortController().signal);
  await vi.waitFor(() => expect(wire).toBeDefined());
  const bytes = new TextEncoder().encode(
    '{"type":"text","text":"Let’s build."}\n',
  );
  const split = bytes.indexOf(0xe2) + 1;
  wire.enqueue(bytes.slice(0, split));
  wire.enqueue(bytes.slice(split));
  await vi.waitFor(() =>
    expect(events).toHaveBeenCalledWith({ type: "text", text: "Let’s build." }),
  );
  wire.enqueue(
    new TextEncoder().encode(
      '{"type":"complete","reply":"Done","ready":false,"revision":1}\n',
    ),
  );
  await Promise.resolve();
  expect(events).toHaveBeenCalledTimes(1);
  wire.close();
  await reading;
  expect(events).toHaveBeenCalledTimes(2);
});
it("rejects missing completion and never replays the mutation", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response('{"type":"text","text":"Working"}\n'));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    streamBuilder(turn, () => {}, new AbortController().signal),
  ).rejects.toThrow(/before the update finished/);
  expect(fetcher).toHaveBeenCalledOnce();
});
