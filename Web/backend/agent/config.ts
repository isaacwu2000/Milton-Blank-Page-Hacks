/** Nonsecret runtime policy. Credentials stay in environment variables on the host. */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
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
export function provider() {
  if (process.env.SOL_PROVIDER === "openrouter") return "openrouter" as const;
  if (process.env.SOL_PROVIDER === "chatgpt") return "chatgpt" as const;
  return process.env.NODE_ENV === "production" ? "openrouter" as const : "chatgpt" as const;
}
