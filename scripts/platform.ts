import { existsSync } from "node:fs";
import { join, win32 } from "node:path";
import { spawnSync, type ChildProcess } from "node:child_process";

export interface Command {
  command: string;
  args: string[];
}

/** Windows Node archives place executables at the archive root, unlike Unix. */
export function managedNodeDirectory(
  state: string,
  platform = process.platform,
): string {
  return platform === "win32"
    ? win32.join(state, "node")
    : join(state, "node", "bin");
}

/** Preserve paths containing spaces; Windows separates PATH entries with semicolons. */
export function prependPath(
  directory: string,
  current: string,
  platform = process.platform,
): string {
  return [directory, current]
    .filter(Boolean)
    .join(platform === "win32" ? ";" : ":");
}

/** Run the real npm JavaScript entry point on Windows; .cmd files require a shell. */
export function npxCommand(
  path: string,
  platform = process.platform,
  exists = existsSync,
): Command | null {
  if (platform !== "win32") return { command: "npx", args: [] };
  for (const entry of path.split(";")) {
    const directory = entry.replace(/^"|"$/g, "");
    if (!directory) continue;
    const node = win32.join(directory, "node.exe");
    const cli = win32.join(
      directory,
      "node_modules",
      "npm",
      "bin",
      "npx-cli.js",
    );
    if (exists(node) && exists(cli)) return { command: node, args: [cli] };
  }
  return null;
}

/** Match the official Node release archive to the host; reject unsupported CPUs. */
export function nodeArchive(
  version: string,
  platform = process.platform,
  arch = process.arch,
): string {
  if (
    !["x64", "arm64"].includes(arch) ||
    !["darwin", "linux", "win32"].includes(platform)
  )
    throw Error(
      "This platform is not supported by the automatic Node installer.",
    );
  return `node-${version}-${platform === "win32" ? "win" : platform}-${arch}.${platform === "win32" ? "zip" : "tar.gz"}`;
}

export function installCommand(platform = process.platform): string {
  return platform === "win32"
    ? 'powershell -NoProfile -ExecutionPolicy Bypass -File "./install.ps1"'
    : "bash install.sh";
}

/** Stop only this child's process tree; never terminate other apps by executable name. */
export function signalChild(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      process.kill(-child.pid, signal);
    }
  } catch {
    // The child may already have exited.
  }
}
