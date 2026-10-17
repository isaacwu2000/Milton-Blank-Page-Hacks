import { fileURLToPath } from "node:url";
/** Runs the fixed hosted processes; a failed child restarts without restarting its peers. */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, openSync, closeSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const logs = resolve(root, ".sportsbuilder");
mkdirSync(logs, { recursive: true, mode: 0o700 });
const environment = {
  ...process.env,
  NODE_ENV: "production",
  SOL_PROVIDER: "openrouter",
  AGENT_INTERNAL_SECRET: process.env.AGENT_INTERNAL_SECRET || randomBytes(32).toString("hex"),
};
const children = new Set<ChildProcess>();
let stopping = false;

/** Stops the complete process groups during host shutdown; no child is restarted afterwards. */
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.pid) {
      try { process.kill(-child.pid, "SIGTERM"); } catch { /* The child may have exited already. */ }
    }
  }
  setTimeout(() => process.exit(0), 2000);
}

/** Restarts a service after exit, with bounded delay to avoid loops during an outage. */
function supervise(name: string, command: string, args: string[], cwd = root, failures = 0) {
  if (stopping) return;
  const log = openSync(resolve(logs, `${name}.log`), "a", 0o600);
  const started = Date.now();
  const child = spawn(command, args, {
    cwd, env: environment, detached: true, stdio: ["ignore", log, log],
  });
  closeSync(log);
  children.add(child);
  child.on("error", () => console.error(`${name} could not start; retrying.`));
  child.on("close", () => {
    children.delete(child);
    if (stopping) return;
    const attempts = Date.now() - started > 60_000 ? 0 : Math.min(failures + 1, 5);
    setTimeout(() => supervise(name, command, args, cwd, attempts), Math.min(1000 * 2 ** attempts, 30_000));
  });
}

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
supervise("api", "uv", ["run", "--frozen", "--no-dev", "uvicorn", "server.app:app", "--host", "127.0.0.1", "--port", "8080", "--workers", "1"], resolve(root, "Web/backend"));
supervise("agent", process.execPath, ["Web/backend/agent/server.ts"]);
supervise("gateway", "nginx", ["-c", resolve(root, "deploy/nginx.conf"), "-g", "daemon off;"]);
