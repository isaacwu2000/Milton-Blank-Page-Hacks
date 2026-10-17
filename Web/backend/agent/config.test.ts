import { afterEach, describe, expect, it } from "vitest";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  hasLocalCodex,
  selectProvider,
  readLocalCredentials,
  loadLocalCredentials,
} from "./config";

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function directory() {
  const path = mkdtempSync(join(tmpdir(), "sportsbuilder-provider-"));
  temporaryDirectories.push(path);
  return path;
}

describe("AI provider selection", () => {
  it("uses OpenRouter when local Codex is unavailable", () => {
    expect(selectProvider(undefined, undefined, false)).toBe("openrouter");
  });
  it("uses ChatGPT for a development machine with Codex", () => {
    expect(selectProvider("development", undefined, true)).toBe("chatgpt");
  });
  it("uses OpenRouter in production even with Codex installed", () => {
    expect(selectProvider("production", undefined, true)).toBe("openrouter");
  });
  it("preserves explicit provider choices", () => {
    expect(selectProvider("development", "openrouter", true)).toBe(
      "openrouter",
    );
    expect(selectProvider("production", "chatgpt", false)).toBe("chatgpt");
  });
});

describe("local Codex detection", () => {
  it("detects an executable CLI without reading credentials", () => {
    const path = directory();
    writeFileSync(join(path, "codex"), "#!/bin/sh\n");
    chmodSync(join(path, "codex"), 0o755);
    expect(hasLocalCodex(path, "linux", path)).toBe(true);
  });
  it("ignores a nonexecutable command and an empty path", () => {
    const path = directory();
    writeFileSync(join(path, "codex"), "not executable");
    chmodSync(join(path, "codex"), 0o644);
    expect(hasLocalCodex(path, "linux", path)).toBe(false);
    expect(hasLocalCodex("", "linux", path)).toBe(false);
  });
  it("ignores executable directories named codex", () => {
    const path = directory();
    mkdirSync(join(path, "codex"));
    expect(hasLocalCodex(path, "linux", path)).toBe(false);
  });
});

describe("installer credential loading", () => {
  function saved(value: string) {
    const root = directory();
    mkdirSync(join(root, ".sportsbuilder"));
    writeFileSync(join(root, ".sportsbuilder/credentials.json"), value);
    return root;
  }
  it("fills blanks while preserving explicit values and ignoring unknown keys", () => {
    const root = saved(
      JSON.stringify({
        OPENROUTER_API_KEY: "saved-key",
        DATABASE_URL: "saved-url",
        NODE_OPTIONS: "ignored",
      }),
    );
    const environment: NodeJS.ProcessEnv = {
      OPENROUTER_API_KEY: "explicit-key",
      DATABASE_URL: " ",
    };
    loadLocalCredentials(root, environment);
    expect(environment).toEqual({
      OPENROUTER_API_KEY: "explicit-key",
      DATABASE_URL: "saved-url",
    });
    expect(readLocalCredentials(directory())).toEqual({});
  });
  it("rejects malformed or invalid data without disclosing contents", () => {
    for (const value of [
      '{"OPENROUTER_API_KEY":"private-dummy-value',
      "[]",
      '{"OPENROUTER_API_KEY":42}',
      '{"OPENROUTER_API_KEY":" "}',
    ]) {
      expect(() => readLocalCredentials(saved(value))).toThrow(
        "Saved credentials could not be read. Rename .sportsbuilder/credentials.json and rerun bash install.sh to enter them again.",
      );
    }
  });
});
