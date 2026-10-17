import { afterEach, expect, it, vi } from "vitest";
import { chat } from "./services/provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("accepts a pasted OpenRouter key wrapped in curly quotes", async () => {
  vi.stubEnv("SOL_PROVIDER", "openrouter");
  vi.stubEnv("OPENROUTER_API_KEY", "  “sk-or-v1-test-only”  ");
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const authorization = new Headers(init?.headers).get("authorization");
    if (authorization !== "Bearer sk-or-v1-test-only")
      throw new TypeError("Header Authorization has invalid value");
    return Response.json({
      choices: [{ message: { content: "A useful form review." } }],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  await expect(
    chat([{ role: "user", content: "Review my overall form." }]),
  ).resolves.toMatchObject({ content: "A useful form review." });
});

it("rejects malformed pasted keys before making a request and never exposes them", async () => {
  vi.stubEnv("SOL_PROVIDER", "openrouter");
  const key = "sk-or-test…truncated";
  vi.stubEnv("OPENROUTER_API_KEY", key);
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const error = await chat([{ role: "user", content: "Review my form" }]).catch(
    (error: Error) => error,
  );
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain("Copy the complete key");
  expect((error as Error).message).not.toContain(key);
  expect(fetcher).not.toHaveBeenCalled();
});

it("identifies TimeoutError as a timeout instead of a connection or key failure", async () => {
  vi.stubEnv("SOL_PROVIDER", "openrouter");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-only");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new DOMException("Deadline", "TimeoutError");
    }),
  );
  await expect(
    chat([{ role: "user", content: "Review my form" }]),
  ).rejects.toThrow("review timed out");
});

it("preserves job cancellation while applying a separate request deadline", async () => {
  vi.stubEnv("SOL_PROVIDER", "openrouter");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-only");
  const job = new AbortController();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.signal).not.toBe(job.signal);
      job.abort(new DOMException("Job deadline", "TimeoutError"));
      expect(init?.signal?.aborted).toBe(true);
      throw new TypeError("Fetch stopped");
    }),
  );
  await expect(
    chat([{ role: "user", content: "Review my form" }], [], job.signal),
  ).rejects.toThrow("review timed out");
});

it.each([
  [401, "rejected the API key"],
  [402, "credits or the key's spending limit"],
  [429, "request limit"],
  [503, "temporarily unavailable"],
])(
  "explains HTTP %s without leaking provider response content",
  async (status, message) => {
    vi.stubEnv("SOL_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-only");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "private-provider-detail" } },
          { status },
        ),
      ),
    );
    const error = await chat([
      { role: "user", content: "Review my form" },
    ]).catch((error: Error) => error);
    expect((error as Error).message).toContain(message);
    expect((error as Error).message).not.toContain("private-provider-detail");
  },
);

it("recognizes an error returned inside a successful HTTP response", async () => {
  vi.stubEnv("SOL_PROVIDER", "openrouter");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-only");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: { code: 402, message: "private detail" } }),
    ),
  );
  await expect(
    chat([{ role: "user", content: "Review my form" }]),
  ).rejects.toThrow("credits or the key's spending limit");
});
