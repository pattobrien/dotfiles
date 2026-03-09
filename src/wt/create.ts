#!/usr/bin/env bun

import { mkdirSync } from "fs";
import { join } from "path";

import { $ } from "bun";

import { getRepoInfo } from "./lib";

const [branchName, baseRef = "HEAD"] = process.argv.slice(2);

if (!branchName) {
  console.log("Usage: wt-create <branch-name> [base-ref]");
  console.log("");
  console.log("Creates:");
  console.log("  Branch:    patt/<branch-name>");
  console.log("  Worktree:  .worktrees/<branch-name>");
  process.exit(1);
}

const { repoRoot } = await getRepoInfo();
const worktreePath = join(repoRoot, ".worktrees", branchName);
const fullBranch = `patt/${branchName}`;

mkdirSync(join(repoRoot, ".worktrees"), { recursive: true });

await $`git worktree add -b ${fullBranch} ${worktreePath} ${baseRef}`.quiet();

console.log("Created worktree:");
console.log(`  Path:   ${worktreePath}`);
console.log(`  Branch: ${fullBranch}`);
