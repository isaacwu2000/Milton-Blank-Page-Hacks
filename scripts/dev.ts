import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

// Bun loads the ignored root .env.local; every child inherits the same private agent token.
const env = {
  ...process.env,
  AGENT_INTERNAL_SECRET:
    process.env.AGENT_INTERNAL_SECRET ?? randomBytes(32).toString("hex"),
};
const children: ChildProcess[] = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
    process.exit(code);
  }, 1500).unref();
}
function start(name: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  children.push(child);
  child.on("error", () => {
    console.error(
      `${name} could not start. Check the local setup instructions.`,
    );
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`${name} stopped (${code ?? "signal"}).`);
      stop(code || 1);
    }
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
if ((process.env.SOL_PROVIDER ?? "chatgpt") !== "openrouter") {
  const ready = await fetch("http://127.0.0.1:10531/v1/models", {
    signal: AbortSignal.timeout(2000),
  })
    .then((r) => r.ok)
    .catch(() => false);
  if (!ready)
    start("ChatGPT sign-in proxy", "npx", ["openai-oauth@2.0.0", "--no-open"]);
}
const python = existsSync(".venv/bin/python") ? ".venv/bin/python" : "python3";
start("Video service", python, [
  "-m",
  "uvicorn",
  "server.app:app",
  "--host",
  "127.0.0.1",
  "--port",
  "8080",
]);
start("AI service", process.execPath, ["agent/server.ts"]);
start("Frontend", process.execPath, ["run", "web"]);
console.log(
  "SportsBuilder is starting at http://127.0.0.1:5173. Complete ChatGPT sign-in in the proxy instructions if prompted.",
);
