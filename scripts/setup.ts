import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { provider } from "../Web/backend/agent/config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const flags = new Set(process.argv.slice(2));
if (flags.has("--help")) {
  console.log(
    "Usage: bash install.sh [--no-start] [--non-interactive]\nInstalls SportsBuilder and starts it. --no-start installs only.\n--non-interactive requires credentials already in .env.local, .env or your environment.",
  );
  process.exit(0);
}
if (
  [...flags].some((flag) => !["--no-start", "--non-interactive"].includes(flag))
) {
  console.error("Unknown option. Run bash install.sh --help.");
  process.exit(1);
}
const state = join(root, ".sportsbuilder");
mkdirSync(state, { recursive: true, mode: 0o700 });
const log = join(state, "setup.log");
writeFileSync(log, "SportsBuilder setup\n", { mode: 0o600 });
chmodSync(log, 0o600);

/** Run an installation stage without printing credential-bearing errors to the terminal. */
async function run(label: string, command: string, args: string[]) {
  console.log(`• ${label}…`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (data: Buffer) => appendFileSync(log, data));
    child.stderr.on("data", (data: Buffer) => appendFileSync(log, data));
    child.on("error", () =>
      reject(Error(`${label} could not start. Details: ${log}`)),
    );
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            Error(
              `${label} failed. Fix the problem shown in ${log}, then run bash install.sh again.`,
            ),
          ),
    );
  });
}

/** Read a credential without echoing it. Existing credentials never need re-entry. */
async function askCredential(label: string): Promise<string> {
  if (flags.has("--non-interactive") || !process.stdin.isTTY) {
    throw Error(
      `${label} is missing. Add it to .env.local, then rerun bash install.sh.`,
    );
  }
  process.stdout.write(`${label}: `);
  const silent = new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
  const prompt = createInterface({
    input: process.stdin,
    output: silent,
    terminal: true,
  });
  try {
    const value = (await prompt.question("")).trim();
    process.stdout.write("\n");
    if (!value)
      throw Error(`${label} is required. Rerun setup when you have it.`);
    return value;
  } finally {
    prompt.close();
  }
}

/** Install Node only for the optional Codex sign-in path; OpenRouter does not need it. */
async function ensureNpx() {
  const managed = join(state, "node", "bin");
  process.env.PATH = `${managed}:${process.env.PATH ?? ""}`;
  if (spawnSync("npx", ["--version"], { stdio: "ignore" }).status === 0) return;
  console.log("• Installing the Node runtime for Codex sign-in…");
  const releases = await fetch("https://nodejs.org/dist/index.json", {
    signal: AbortSignal.timeout(30000),
  }).then((response) => {
    if (!response.ok)
      throw Error(
        "Could not check the official Node download. Please retry setup.",
      );
    return response.json() as Promise<
      { version: string; lts: string | false }[]
    >;
  });
  const version = releases.find(
    (release) => /^v24\.\d+\.\d+$/.test(release.version) && release.lts,
  )?.version;
  if (!version)
    throw Error(
      "An official Node 24 LTS download is unavailable. Please retry setup.",
    );
  const system = process.platform === "darwin" ? "darwin" : "linux";
  if (!["x64", "arm64"].includes(process.arch))
    throw Error("This CPU is not supported by the automatic Node installer.");
  const file = `node-${version}-${system}-${process.arch}.tar.gz`;
  const base = `https://nodejs.org/dist/${version}`;
  const download = async (name: string) => {
    const response = await fetch(`${base}/${name}`, {
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok)
      throw Error("The official Node download failed. Please retry setup.");
    return Buffer.from(await response.arrayBuffer());
  };
  const [manifest, archive] = await Promise.all([
    download("SHASUMS256.txt"),
    download(file),
  ]);
  const expected = manifest
    .toString()
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .find((parts) => parts[1] === file)?.[0];
  if (
    !expected ||
    createHash("sha256").update(archive).digest("hex") !== expected
  )
    throw Error("Node download verification failed. Please retry setup.");
  const temporary = mkdtempSync(join(tmpdir(), "sportsbuilder-node-"));
  try {
    const path = join(temporary, file);
    writeFileSync(path, archive);
    mkdirSync(join(state, "node"), { recursive: true });
    await run("Unpacking Node", "tar", [
      "-xzf",
      path,
      "--strip-components=1",
      "-C",
      join(state, "node"),
    ]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  if (spawnSync("npx", ["--version"], { stdio: "ignore" }).status !== 0)
    throw Error(
      "The Node runtime could not start. See .sportsbuilder/setup.log and rerun setup.",
    );
}

try {
  console.log("\nSportsBuilder setup\n");
  const selected = provider();
  console.log(
    selected === "chatgpt"
      ? "Codex found. Using your local ChatGPT sign-in."
      : "Using OpenRouter. Codex is not required.",
  );
  const required = [
    ["DATABASE_URL", "Neon database connection string"],
    ["DAYTONA_API_KEY", "Daytona API key"],
    ["NEON_STORAGE_ENDPOINT", "Neon storage endpoint"],
    ["NEON_STORAGE_ACCESS_KEY_ID", "Neon storage access key"],
    ["NEON_STORAGE_SECRET_ACCESS_KEY", "Neon storage secret key"],
    ...(selected === "openrouter"
      ? [["OPENROUTER_API_KEY", "OpenRouter API key"]]
      : []),
  ];
  const missing = required.filter(([key]) => !process.env[key]?.trim());
  if (missing.length)
    console.log(
      "Paste these connection details once. They stay in your private .env.local file; input is hidden.\n",
    );
  const localEnv = join(root, ".env.local");
  const additions: string[] = [];
  for (const [key, label] of missing) {
    const value = await askCredential(label);
    process.env[key] = value;
    additions.push(`${key}=${JSON.stringify(value).replaceAll("$", "\\$")}`);
  }
  if (additions.length) {
    // Append missing values only; never replace an existing configured environment file.
    appendFileSync(localEnv, `\n${additions.join("\n")}\n`, { mode: 0o600 });
    chmodSync(localEnv, 0o600);
  }
  if (selected === "chatgpt") await ensureNpx();
  await run("Installing app dependencies", process.execPath, [
    "install",
    "--frozen-lockfile",
  ]);
  await run(
    "Installing Python dependencies (first run may take a few minutes)",
    "uv",
    ["sync", "--project", "Web/backend", "--locked", "--python", "3.12"],
  );
  await run("Preparing your database", "uv", [
    "run",
    "--project",
    "Web/backend",
    "python",
    "scripts/migrate.py",
  ]);
  await run("Checking private video storage", "uv", [
    "run",
    "--project",
    "Web/backend",
    "--directory",
    "Web/backend",
    "python",
    "-c",
    "from server import store; store.s3().head_bucket(Bucket=store.BUCKET)",
  ]);
  await run("Building the app", process.execPath, ["run", "build"]);
  console.log(
    flags.has("--no-start")
      ? "\nSetup complete. Start the app with: bash install.sh\n"
      : "\nSetup complete. Open http://127.0.0.1:5173/ after the services start.\nNext time: bash install.sh (already installed tools are reused).\n",
  );
  if (!flags.has("--no-start")) {
    const child = spawn(process.execPath, ["run", "dev"], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    for (const signal of ["SIGINT", "SIGTERM"] as const)
      process.on(signal, () => child.kill(signal));
    child.on("error", () => {
      console.error("Could not start the app. Run bash install.sh again.");
      process.exitCode = 1;
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 1;
    });
  }
} catch (error) {
  console.error(
    `\n${error instanceof Error ? error.message : "Setup failed. Please rerun bash install.sh."}`,
  );
  process.exitCode = 1;
}
