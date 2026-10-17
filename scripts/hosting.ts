/** Nonsecret deployment policy and source selection for the public 48-hour test. */
export const hosting = {
  workspace: "/opt/sportsbuilder",
  cpu: 2,
  memory: 4,
  disk: 10,
  port: 8000,
  lifetimeMinutes: 48 * 60,
} as const;

/** Includes application sources only; credentials, evidence and installed packages never ship. */
export function deployableSource(path: string): boolean {
  if (path.split("/").some((part) => ["..", ".env", ".env.local", ".sportsbuilder", "node_modules", ".venv", "output", "__pycache__", "dist"].includes(part))) return false;
  return ["package.json", "bun.lock", "tsconfig.json", "vitest.config.ts"].includes(path)
    || /^(Web\/(frontend|backend|shared)\/|scripts\/|deploy\/)/.test(path)
    || path === ".agents/learnunlock/reviewedArtifactAuthoring.ts";
}
