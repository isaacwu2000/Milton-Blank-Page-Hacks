import { fileURLToPath } from "node:url";
/** Creates one expiring public test host. Credentials travel through the SDK, never source archives. */
import { Daytona, Image } from "@daytonaio/sdk";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadLocalCredentials } from "../Web/backend/agent/config";
import { deployableSource, hosting } from "./hosting";

const root = fileURLToPath(new URL("../", import.meta.url));
const stateDirectory = resolve(root, ".sportsbuilder");
const stateFile = resolve(stateDirectory, "daytona-host.json");
loadLocalCredentials();
const keys = ["DATABASE_URL", "NEON_STORAGE_ENDPOINT", "NEON_STORAGE_ACCESS_KEY_ID", "NEON_STORAGE_SECRET_ACCESS_KEY", "OPENROUTER_API_KEY", "DAYTONA_API_KEY"] as const;
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

async function main() {
  const credentials: Record<string, string> = {};
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (!value) throw Error(`Missing ${key}; configure it in the ignored local environment.`);
    credentials[key] = value;
  }
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  // A failed or interrupted invocation must be inspected before creating another billable host.
  try {
    const previous = JSON.parse(readFileSync(stateFile, "utf8"));
    if (previous.sandboxId) throw Error("A host is already recorded. Inspect or stop it before creating another.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const paths = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root }).toString().split("\0").filter(Boolean);
  const files = [...new Set(paths)].filter(deployableSource).filter((path) => lstatSync(resolve(root, path)).isFile());
  const list = resolve(stateDirectory, "deploy-files.txt");
  writeFileSync(list, files.join("\n") + "\n", { mode: 0o600 });
  const archive = resolve(stateDirectory, "source.tar.gz");
  execFileSync("tar", ["-czf", archive, "-T", list], { cwd: root });
  const digest = createHash("sha256").update(readFileSync(archive)).digest("hex");
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim();
  const dirty = Boolean(execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root }).toString().trim());
  const client = new Daytona({ apiKey: credentials.DAYTONA_API_KEY, requestTimeoutMs: 600_000 });
  console.log("Creating the 48-hour Daytona test host…");
  const sandbox = await client.create({
    image: Image.fromDockerfile(resolve(root, "deploy/Dockerfile")),
    user: "root",
    resources: { cpu: hosting.cpu, memory: hosting.memory, disk: hosting.disk },
    public: true,
    autoStopInterval: 0,
    autoPauseInterval: 0,
    autoDeleteInterval: 0,
    ttlMinutes: hosting.lifetimeMinutes,
    envVars: {
      ...credentials,
      NODE_ENV: "production", SOL_PROVIDER: "openrouter",
      AGENT_INTERNAL_SECRET: randomBytes(32).toString("hex"),
      HF_HOME: `${hosting.workspace}/.sportsbuilder/models`,
      TOKENIZERS_PARALLELISM: "false",
      SPORTSBUILDER_REVISION: revision,
    },
    labels: { app: "sportsbuilder", purpose: "public-48-hour-test", revision },
  }, { timeout: 600 });
  const metadata = {
    sandboxId: sandbox.id, revision, dirty, sourceSha256: digest,
    createdAt: new Date().toISOString(), expiresAt: sandbox.autoDestroyAt,
    resources: { cpu: hosting.cpu, memoryGiB: hosting.memory, diskGiB: hosting.disk },
    status: "preparing", url: "",
  };
  const save = () => writeFileSync(stateFile, JSON.stringify(metadata, null, 2), { mode: 0o600 });
  save();
  try {
    const result = await sandbox.process.executeCommand(`mkdir -p ${quote(hosting.workspace)}`, undefined, undefined, 30);
    if (result.exitCode !== 0) throw Error("Host directory preparation failed.");
    await sandbox.fs.uploadFile(archive, `${hosting.workspace}/source.tar.gz`);
    const prepare = `cd ${quote(hosting.workspace)} && tar -xzf source.tar.gz && rm source.tar.gz && mkdir -p .sportsbuilder && chmod 700 .sportsbuilder && bun install --frozen-lockfile > .sportsbuilder/install.log 2>&1 && uv sync --project Web/backend --frozen --no-dev >> .sportsbuilder/install.log 2>&1 && bun run build >> .sportsbuilder/install.log 2>&1 && nginx -t -c ${hosting.workspace}/deploy/nginx.conf >> .sportsbuilder/install.log 2>&1`;
    console.log(`Host created: ${sandbox.id}. Installing the locked application dependencies…`);
    const installed = await sandbox.process.executeCommand(prepare, hosting.workspace, undefined, 900);
    if (installed.exitCode !== 0) throw Error("Host installation failed. Inspect the private install log.");
    await sandbox.process.createSession("sportsbuilder-host");
    await sandbox.process.executeSessionCommand("sportsbuilder-host", {
      command: `cd ${quote(hosting.workspace)} && bun scripts/host.ts > .sportsbuilder/supervisor.log 2>&1`,
      runAsync: true,
    });
    await sandbox.refreshData();
    metadata.expiresAt = sandbox.autoDestroyAt;
    metadata.url = (await sandbox.getPreviewLink(hosting.port)).url;
    metadata.status = "running";
    save();
    console.log(JSON.stringify(metadata, null, 2));
  } catch (error) {
    metadata.status = "failed";
    save();
    // Failed setup is not a useful public host; delete it rather than leave it billing.
    await sandbox.delete(60).then(() => { metadata.status = "deleted-after-failure"; save(); }).catch(() => {});
    throw error;
  }
}

await main().catch((error) => {
  let message = error instanceof Error ? error.message : "Deployment failed";
  for (const key of keys) {
    const value = process.env[key];
    if (value) message = message.replaceAll(value, "[redacted]");
  }
  console.error(message.slice(0, 1200));
  process.exitCode = 1;
});
