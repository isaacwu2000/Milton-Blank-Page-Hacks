/** A private bridge to Neon's official HTTPS driver; it uses the existing database URL. */
import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";

const requestSchema = z.object({
  query: z.string().min(1).max(32_000),
  parameters: z.array(z.unknown()).max(100),
}).strict();

/** Authenticates internal SQL before contacting Neon; query errors never disclose credentials. */
export function databaseRouter() {
  const router = Router();
  router.post("/", async (req, res) => {
    const expected = process.env.AGENT_INTERNAL_SECRET;
    const supplied = req.get("authorization");
    const token = `Bearer ${expected}`;
    if (!expected || !supplied || Buffer.byteLength(supplied) !== Buffer.byteLength(token)
      || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) {
      res.status(403).json({ error: "Internal access required." });
      return;
    }
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid database request." });
      return;
    }
    try {
      if (!process.env.DATABASE_URL) throw Error("Database unavailable");
      const sql = neon(process.env.DATABASE_URL, { arrayMode: true });
      const rows = await sql.query(parsed.data.query, parsed.data.parameters, {
        fetchOptions: { signal: AbortSignal.timeout(40_000) },
      });
      res.json(rows);
    } catch {
      res.status(503).json({ error: "Database request could not complete." });
    }
  });
  return router;
}
