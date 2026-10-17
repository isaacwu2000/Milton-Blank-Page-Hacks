import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { delimiter, resolve } from "node:path";
import { homedir } from "node:os";
import { config, provider } from "../Web/backend/agent";

// Bun loads the ignored root .env.local; every child inherits the same private agent token.
const env: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: [
    resolve(".sportsbuilder/node/bin"),
    resolve(homedir(), ".local/bin"),
    process.env.PATH ?? "",
  ].join(delimiter),
  AGENT_INTERNAL_SECRET:
    process.env.AGENT_INTERNAL_SECRET ?? randomBytes(32).toString("hex"),
};
const children: ChildProcess[] = [];
let stopping = false;
function signalChild(child: ChildProcess, signal: NodeJS.Signals) {
  try {
    if (process.platform !== "win32" && child.pid)
      process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    /* The child may already have exited. */
  }
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) signalChild(child, "SIGTERM");
  setTimeout(() => {
    for (const child of children) signalChild(child, "SIGKILL");
    process.exit(code);
  }, 1500).unref();
}
function start(name: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
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
const selectedProvider = provider();
env.SOL_PROVIDER = selectedProvider;
if (
  selectedProvider === "openrouter" &&
  !process.env.OPENROUTER_API_KEY?.trim()
) {
  console.error(
    "OpenRouter needs an API key. Run bash install.sh to finish setup, or add OPENROUTER_API_KEY to .env.local.",
  );
  process.exit(1);
}
if (selectedProvider === "chatgpt") {
  const ready = await fetch(`${config.localProxyUrl}/models`, {
    signal: AbortSignal.timeout(2000),
  })
    .then((r) => r.ok)
    .catch(() => false);
  if (!ready)
    start("ChatGPT sign-in proxy", "npx", ["openai-oauth@2.0.0", "--no-open"]);
}
const backendDirectory = resolve("Web/backend");
start("Video service", "uv", [
  "run",
  "--project",
  backendDirectory,
  "--directory",
  backendDirectory,
  "uvicorn",
  "server.app:app",
  "--host",
  "127.0.0.1",
  "--port",
  "8080",
]);
start("AI service", process.execPath, ["Web/backend/agent/server.ts"]);
start("Frontend", process.execPath, ["run", "web"]);
console.log(
  `SportsBuilder is starting at http://127.0.0.1:5173.${selectedProvider === "chatgpt" ? " Complete ChatGPT sign-in in the proxy instructions if prompted." : " AI provider: OpenRouter."}`,
);
