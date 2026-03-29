import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { StopHookInput } from "@anthropic-ai/claude-agent-sdk";

const input: StopHookInput = await Bun.stdin.json();
const cwd = input.cwd ?? process.cwd();
const pkgPath = join(cwd, "package.json");

if (!existsSync(pkgPath)) process.exit(0);

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const scripts: Record<string, string> = pkg.scripts ?? {};

const cmd = scripts["format:fix"]
  ? "format:fix"
  : scripts["format"]
    ? "format"
    : null;
if (!cmd) process.exit(0);

Bun.spawnSync(["pnpm", "run", cmd], {
  cwd,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
