import { describe, expect, it, vi } from "vitest";
import * as childProcess from "node:child_process";
import type { ChildProcess } from "node:child_process";
vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));
import {
  installCommand,
  managedNodeDirectory,
  nodeArchive,
  npxCommand,
  prependPath,
  signalChild,
} from "./platform";

describe("native Windows setup", () => {
  it("keeps managed Node and PATH entries intact in folders with spaces", () => {
    expect(
      managedNodeDirectory(
        "C:\\Projects\\Sports Builder\\.sportsbuilder",
        "win32",
      ),
    ).toBe("C:\\Projects\\Sports Builder\\.sportsbuilder\\node");
    expect(
      prependPath("C:\\Sports Builder\\node", "C:\\Windows;C:\\Tools", "win32"),
    ).toBe("C:\\Sports Builder\\node;C:\\Windows;C:\\Tools");
    expect(nodeArchive("v24.1.2", "win32", "x64")).toBe(
      "node-v24.1.2-win-x64.zip",
    );
    expect(nodeArchive("v24.1.2", "win32", "arm64")).toBe(
      "node-v24.1.2-win-arm64.zip",
    );
  });
  it("invokes npm through Node without shell interpolation or cmd execution", () => {
    const folder = "C:\\Programs\\Node (local)";
    const files = new Set([
      `${folder}\\node.exe`,
      `${folder}\\node_modules\\npm\\bin\\npx-cli.js`,
    ]);
    expect(
      npxCommand(`C:\\Empty;"${folder}"`, "win32", (path) =>
        files.has(String(path)),
      ),
    ).toEqual({
      command: `${folder}\\node.exe`,
      args: [`${folder}\\node_modules\\npm\\bin\\npx-cli.js`],
    });
    expect(npxCommand("C:\\Missing", "win32", () => false)).toBeNull();
  });
  it("gives a process-local execution policy recovery command", () => {
    expect(installCommand("win32")).toBe(
      "powershell -NoProfile -ExecutionPolicy Bypass -File .\\install.ps1",
    );
  });
  it("terminates only its owned process tree by PID", () => {
    const platform = vi
      .spyOn(process, "platform", "get")
      .mockReturnValue("win32");
    const spawn = vi.mocked(childProcess.spawnSync);
    signalChild(
      { pid: 12345, exitCode: null, signalCode: null } as ChildProcess,
      "SIGTERM",
    );
    expect(spawn).toHaveBeenCalledWith(
      "taskkill.exe",
      ["/PID", "12345", "/T", "/F"],
      { stdio: "ignore", windowsHide: true },
    );
    spawn.mockClear();
    signalChild(
      { pid: 12345, exitCode: 0, signalCode: null } as ChildProcess,
      "SIGKILL",
    );
    expect(spawn).not.toHaveBeenCalled();
    platform.mockRestore();
  });
});

describe("existing macOS and Linux setup", () => {
  it("preserves Unix layouts, npx and retry commands", () => {
    expect(managedNodeDirectory("/tmp/project/.sportsbuilder", "darwin")).toBe(
      "/tmp/project/.sportsbuilder/node/bin",
    );
    expect(prependPath("/tmp/project/node/bin", "/usr/bin", "darwin")).toBe(
      "/tmp/project/node/bin:/usr/bin",
    );
    expect(npxCommand("/usr/bin", "darwin")).toEqual({
      command: "npx",
      args: [],
    });
    expect(nodeArchive("v24.1.2", "darwin", "arm64")).toBe(
      "node-v24.1.2-darwin-arm64.tar.gz",
    );
    expect(nodeArchive("v24.1.2", "linux", "x64")).toBe(
      "node-v24.1.2-linux-x64.tar.gz",
    );
    expect(installCommand("linux")).toBe("bash install.sh");
    expect(() => nodeArchive("v24.1.2", "linux", "ia32")).toThrow(
      "not supported",
    );
  });
});
