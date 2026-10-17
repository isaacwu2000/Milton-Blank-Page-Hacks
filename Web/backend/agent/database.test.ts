import { expect, it } from "vitest";
import express from "express";
import { databaseRouter } from "./runtime/database";

it("rejects unauthenticated SQL requests even when the testing workspace is public", async () => {
  const previous = process.env.AGENT_INTERNAL_SECRET;
  process.env.AGENT_INTERNAL_SECRET = "test-internal-secret";
  const app = express();
  app.use(express.json());
  app.use("/internal/database", databaseRouter());
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("Missing test address");
  try {
    for (const authorization of [undefined, "Bearer wrong", "Bearer test-internal-secrex"]) {
      const result = await fetch(`http://127.0.0.1:${address.port}/internal/database`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(authorization ? { authorization } : {}) },
        body: JSON.stringify({ query: "DELETE FROM sportsbuilder_records", parameters: [] }),
      });
      expect(result.status).toBe(403);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previous === undefined) delete process.env.AGENT_INTERNAL_SECRET;
    else process.env.AGENT_INTERNAL_SECRET = previous;
  }
});
