/** Nonsecret runtime policy. Credentials stay in environment variables on the host. */
import { fileURLToPath } from "node:url";
import { delimiter, resolve } from "node:path";
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
export const config = {
  host: "127.0.0.1",
  port: 3001,
  backendUrl: "http://127.0.0.1:8080",
  localProxyUrl: "http://127.0.0.1:10531/v1",
  openRouterUrl: "https://openrouter.ai/api/v1",
  model: "openai/gpt-6.1-sol",
  reasoning: "medium" as const,
  providerTimeoutMs: 180_000,
  backendTimeoutMs: 60_000,
  reviewBudgetMs: 600_000,
  coachBudgetMs: 900_000,
  imageBatchSize: 32,
  maxBuilderTurns: 12,
  maxOutputTokens: 6000,
  evidenceDirectory: resolve(repositoryRoot, "output"),
  sandbox: {
    workspace: "/home/daytona/sportsbuilder",
    bundle: resolve(repositoryRoot, "Web/frontend/dist"),
    autoStopMinutes: 10,
    ttlMinutes: 20,
    createTimeoutSeconds: 180,
    browserTimeoutSeconds: 75,
    playwrightRequirement: "playwright==1.55.0",
    uvInstaller: "https://astral.sh/uv/install.sh",
  },
};
/** Selects a provider once, before requests. Explicit choices never silently fall back. */
export function selectProvider(
  nodeEnvironment: string | undefined,
  override: string | undefined,
  codexInstalled: boolean,
): "openrouter" | "chatgpt" {
  if (override === "openrouter" || override === "chatgpt") return override;
  return nodeEnvironment === "production" || !codexInstalled
    ? "openrouter"
    : "chatgpt";
}

/** Finds installed Codex without opening or reading its credential files. */
export function hasLocalCodex(
  searchPath = process.env.PATH ?? "",
  platform = process.platform,
  userHome = homedir(),
): boolean {
  const names = platform === "win32" ? ["codex.exe", "codex.cmd"] : ["codex"];
  const separator = platform === "win32" ? ";" : delimiter;
  for (const directory of searchPath.split(separator).filter(Boolean)) {
    for (const name of names) {
      try {
        const path = resolve(directory, name);
        accessSync(path, constants.X_OK);
        if (statSync(path).isFile()) return true;
      } catch {
        /* Keep searching installed executable locations. */
      }
    }
  }
  return (
    platform === "darwin" &&
    [
      "/Applications/Codex.app",
      resolve(userHome, "Applications/Codex.app"),
    ].some((path) => existsSync(path))
  );
}

export function provider() {
  return selectProvider(
    process.env.NODE_ENV,
    process.env.SOL_PROVIDER,
    hasLocalCodex(),
  );
}
