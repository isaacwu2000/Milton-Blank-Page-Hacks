import { expect, it, vi } from "vitest";
import { sampleTool } from "../../shared";
import { buildStream } from "./services/builderStream";
import { streamChat } from "./services/provider";
vi.mock("./services/provider", () => ({ streamChat: vi.fn() }));
it("streams useful text before a complete atomic edit and repairs using the exact error", async () => {
  const bad = {
    type: "edit",
    path: "/name",
    old: "Wrong name",
    value: "Squat coach",
  };
  vi.mocked(streamChat)
    .mockImplementationOnce(async function* () {
      yield JSON.stringify({ type: "text", text: "I’m renaming your coach." }) +
        "\n";
      yield JSON.stringify(bad) +
        '\n{"type":"commit","baseRevision":2,"ready":false}\n';
    })
    .mockImplementationOnce(async function* () {
      yield JSON.stringify({ ...bad, old: sampleTool.name }) +
        '\n{"type":"commit","baseRevision":2,"ready":false}\n';
    });
  const events: unknown[] = [];
  const result = await buildStream(
    [{ role: "user", content: "Rename it Squat coach" }],
    sampleTool,
    2,
    false,
    undefined,
    (event) => events.push(event),
    new AbortController().signal,
  );
  expect(events[0]).toEqual({ type: "text", text: "I’m renaming your coach." });
  expect(events).toContainEqual({
    type: "status",
    message: "Fixing a configuration issue…",
  });
  expect(result.preview?.name).toBe("Squat coach");
  expect(sampleTool.name).not.toBe("Squat coach");
  const repair = JSON.stringify(vi.mocked(streamChat).mock.calls[1][0]);
  expect(repair).toContain("/name");
  expect(repair).toContain("Wrong name");
  expect(repair).toContain(sampleTool.name);
  expect(repair).toContain("expected");
});

it("rejects an entire invalid batch without publishing its earlier valid edit", async () => {
  vi.mocked(streamChat).mockImplementation(async function* () {
    yield JSON.stringify({ type: "text", text: "I’ll update the coach." }) +
      "\n";
    yield JSON.stringify({
      type: "edit",
      path: "/name",
      old: sampleTool.name,
      value: "Never published",
    }) + "\n";
    yield JSON.stringify({
      type: "edit",
      path: "/metrics/0/unit",
      old: sampleTool.metrics[0].unit,
      value: "speed",
    }) + '\n{"type":"commit","baseRevision":1,"ready":false}\n';
  });
  const events: unknown[] = [];
  await expect(
    buildStream(
      [{ role: "user", content: "Change the coach" }],
      sampleTool,
      1,
      false,
      undefined,
      (event) => events.push(event),
      new AbortController().signal,
    ),
  ).rejects.toThrow(/after repair/);
  expect(
    events.every((event) => !(event as { preview?: unknown }).preview),
  ).toBe(true);
  expect(sampleTool.name).not.toBe("Never published");
  expect(JSON.stringify(vi.mocked(streamChat).mock.calls.at(-1)?.[0])).toMatch(
    /unit|dimension/i,
  );
});

it("does not repair an interrupted provider stream", async () => {
  vi.mocked(streamChat)
    .mockClear()
    .mockImplementation(async function* () {
      yield '{"type":"text","text":"Starting…"}\n';
      throw Error("The model stream ended before completion.");
    });
  await expect(
    buildStream(
      [{ role: "user", content: "Build" }],
      undefined,
      0,
      false,
      undefined,
      () => {},
      new AbortController().signal,
    ),
  ).rejects.toThrow(/before completion/);
  expect(streamChat).toHaveBeenCalledOnce();
});

it("gives repair the exact nested formula path and operand units even after replacing the metric list", async () => {
  const invalid = structuredClone(sampleTool.metrics);
  invalid[0].formula = {
    op: "abs",
    args: [
      {
        op: "add",
        args: [{ op: "time" }, { op: "speed", joint: "left_knee" }],
      },
    ],
  };
  vi.mocked(streamChat)
    .mockClear()
    .mockImplementationOnce(async function* () {
      yield '{"type":"text","text":"I’ll update the metrics."}\n';
      yield JSON.stringify({
        type: "edit",
        path: "/metrics",
        old: sampleTool.metrics,
        value: invalid,
      }) + '\n{"type":"commit","baseRevision":2,"ready":false}';
    })
    .mockImplementationOnce(async function* () {
      yield '{"type":"commit","baseRevision":2,"ready":false}';
    });
  await buildStream(
    [{ role: "user", content: "Change metrics" }],
    sampleTool,
    2,
    false,
    undefined,
    () => {},
    new AbortController().signal,
  );
  const correction = JSON.stringify(vi.mocked(streamChat).mock.calls[1][0]);
  expect(correction).toContain("/metrics/0/formula/args/0");
  expect(correction).toContain("same scalar units");
  expect(correction).toContain("time");
  expect(correction).toContain("speed");
});
