import fs from "node:fs/promises";

import { execa } from "execa";
import { expect, test } from "vitest";

async function commandExists(command: string) {
  const result = await execa("zsh", ["-lic", `command -v ${command}`], {
    reject: false,
  });
  return result.exitCode === 0;
}

async function pathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function waitForDockerDaemon(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";

  while (Date.now() < deadline) {
    const result = await execa("docker", ["version", "--format", "{{.Server.Version}}"], {
      reject: false,
    });
    if (result.exitCode === 0 && result.stdout.trim().length > 0) return;

    lastError = [result.stderr, result.stdout].filter(Boolean).join("\n");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`Timed out waiting for Docker daemon.\n${lastError}`);
}

// TODO: Enable once agentic app initialization can complete Docker Desktop's
// first-run setup dialogs (Rosetta install, subscription agreement, daemon).
test.skip(
  "Docker Desktop daemon runs hello-world",
  { tags: ["apps", "setup-validation"], timeout: 180_000 },
  async () => {
    expect(
      await pathExists("/Applications/Docker.app"),
      "Docker Desktop should be installed at /Applications/Docker.app",
    ).toBe(true);
    expect(await commandExists("docker"), "docker CLI should be installed").toBe(true);

    await execa("open", ["-ga", "Docker"], { reject: false });
    await waitForDockerDaemon();

    const result = await execa("docker", ["run", "--rm", "hello-world"], {
      reject: false,
    });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain("Hello from Docker!");
  },
);
