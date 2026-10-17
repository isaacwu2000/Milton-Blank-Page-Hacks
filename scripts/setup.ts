import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { provider, readLocalCredentials } from "../Web/backend/agent/config";
import {
  installCommand,
  managedNodeDirectory,
  nodeArchive,
  npxCommand,
  prependPath,
  signalChild,
} from "./platform";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const flags = new Set(process.argv.slice(2));
const installer = installCommand();
if (flags.has("--help")) {
  console.log(
    `Usage: ${installer} [--no-start] [--non-interactive]\nInstalls SportsBuilder and starts it. --no-start installs only.\n--non-interactive requires credentials already in .env.local, .env or your environment.`,
  );
  process.exit(0);
}
if (
  [...flags].some((flag) => !["--no-start", "--non-interactive"].includes(flag))
) {
  console.error(`Unknown option. Run ${installer} --help.`);
  process.exit(1);
}
const state = join(root, ".sportsbuilder");
mkdirSync(state, { recursive: true, mode: 0o700 });
const log = join(state, "setup.log");
writeFileSync(log, "SportsBuilder setup\n", { mode: 0o600 });
chmodSync(log, 0o600);

/**
 * Run a setup stage and keep subprocess output in the private log.
 * Only controlled checks with a publicErrorPrefix may expose their safe stdout diagnostic.
 * Wait for output streams to close before reporting success or failure.
 */
async function run(
  label: string,
  command: string,
  args: string[],
  publicErrorPrefix?: string,
) {
  console.log(`• ${label}…`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let publicOutput = "";
    child.stdout.on("data", (data: Buffer) => {
      appendFileSync(log, data);
      // Only the storage check emits fixed, credential-free public diagnostics.
      if (publicErrorPrefix)
        publicOutput = (publicOutput + data.toString()).slice(-8192);
    });
    child.stderr.on("data", (data: Buffer) => appendFileSync(log, data));
    child.on("error", () =>
      reject(Error(`${label} could not start. Details: ${log}`)),
    );
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            Error(
              `${label} failed. ${
                publicErrorPrefix
                  ? (publicOutput
                      .split(/\r?\n/)
                      .find((line) => line.startsWith(publicErrorPrefix))
                      ?.slice(publicErrorPrefix.length) ??
                    `See ${log} for details.`)
                  : `Fix the problem shown in ${log}.`
              } Then run ${installer} again.`,
            ),
          ),
    );
  });
}

/** Read a credential without echoing it. Existing credentials never need re-entry. */
async function askCredential(label: string): Promise<string> {
  if (flags.has("--non-interactive") || !process.stdin.isTTY) {
    throw Error(
      `${label} is missing. Add it to .env.local, then rerun ${installer}.`,
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
  const managed = managedNodeDirectory(state);
  process.env.PATH = prependPath(managed, process.env.PATH ?? "");
  const available = npxCommand(process.env.PATH);
  if (
    available &&
    spawnSync(available.command, [...available.args, "--version"], {
      stdio: "ignore",
    }).status === 0
  )
    return;
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
  const file = nodeArchive(version);
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
    if (process.platform === "win32") {
      await run("Unpacking Node", "uv", [
        "run",
        "--no-project",
        "--python",
        "3.12",
        "python",
        "-c",
        "import pathlib, shutil, sys, zipfile; archive, target = sys.argv[1:]; parent = pathlib.Path(archive).parent; z = zipfile.ZipFile(archive); z.extractall(parent); shutil.copytree(parent / pathlib.Path(archive).stem, target, dirs_exist_ok=True)",
        path,
        join(state, "node"),
      ]);
    } else
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
  const installed = npxCommand(process.env.PATH ?? "");
  if (
    !installed ||
    spawnSync(installed.command, [...installed.args, "--version"], {
      stdio: "ignore",
    }).status !== 0
  )
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
      "Paste these connection details once. They stay in your private local settings; input is hidden.\n",
    );
  const credentialFile = join(state, "credentials.json");
  const additions: Record<string, string> = {};
  for (const [key, label] of missing) {
    const value = await askCredential(label);
    process.env[key] = value;
    additions[key] = value;
  }
  if (Object.keys(additions).length) {
    // JSON preserves literal punctuation across Bun and Python; environment files stay untouched.
    const pending = join(state, "credentials.pending.json");
    writeFileSync(
      pending,
      JSON.stringify({ ...readLocalCredentials(root), ...additions }, null, 2) +
        "\n",
      { mode: 0o600 },
    );
    chmodSync(pending, 0o600);
    renameSync(pending, credentialFile);
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
  await run(
    "Checking private video storage",
    "uv",
    [
      "run",
      "--project",
      "Web/backend",
      "--directory",
      "Web/backend",
      "python",
      "-m",
      "server.storage_check",
    ],
    "SPORTSBUILDER_STORAGE_ERROR: ",
  );
  await run("Building the app", process.execPath, ["run", "build"]);
  console.log(
    flags.has("--no-start")
      ? `\nSetup complete. Start the app with: ${installer}\n`
      : `\nSetup complete. Open http://127.0.0.1:5173/ after the services start.\nNext time: ${installer} (already installed tools are reused).\n`,
  );
  if (!flags.has("--no-start")) {
    const child = spawn(process.execPath, ["run", "dev"], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    for (const signal of ["SIGINT", "SIGTERM"] as const)
      process.on(signal, () => signalChild(child, signal));
    child.on("error", () => {
      console.error(`Could not start the app. Run ${installer} again.`);
      process.exitCode = 1;
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 1;
    });
  }
} catch (error) {
  console.error(
    `\n${error instanceof Error ? error.message : `Setup failed. Please rerun ${installer}.`}`,
  );
  process.exitCode = 1;
}
